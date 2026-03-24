import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { MarketItem, MarketItemId, MarketTransaction } from '../types';
import { MARKET_ITEMS, getMarketItem } from '../utils/marketItems';
import { InventoryService } from './inventoryService';
import { EffectService } from './effectService';
import { LeaderboardService } from './LeaderboardService';
import { NotificationInboxService } from './notificationInboxService';

const txCol = collection(db, 'transactions');

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const attackItems: MarketItemId[] = ['freeze', 'score_drop'];
/** Günde kullanılabilecek saldırı (use + blocked) üst sınırı */
const DAILY_ATTACK_LIMIT = 1;

export const MarketService = {
  listItems(): MarketItem[] {
    return MARKET_ITEMS;
  },

  async buyItem(userId: string, itemId: MarketItemId): Promise<void> {
    const item = getMarketItem(itemId);
    if (!item) throw new Error('Item bulunamadi.');
    await InventoryService.spendBrScore(userId, item.cost);
    await InventoryService.addItem(userId, itemId, 1);
    await this.logTransaction({
      userId,
      itemId,
      actionType: 'buy',
      message: `${item.title} satin alindi.`,
    });
  },

  async canUseAttackToday(userId: string): Promise<boolean> {
    // Composite index zorunlulugunu azaltmak icin sorguyu tek kosula indir,
    // gun/saldiri filtresini istemci tarafinda uygula.
    const q = query(txCol, where('userId', '==', userId));
    const snap = await getDocs(q);
    const dayStart = startOfDay();
    const count = snap.docs
      .map((d) => d.data() as Omit<MarketTransaction, 'id'>)
      .filter((t) => t.timestamp >= dayStart)
      .filter((t) => attackItems.includes(t.itemId))
      .filter(
        (t) =>
          t.actionType === 'use' ||
          t.actionType === 'blocked'
      ).length;
    return count < DAILY_ATTACK_LIMIT;
  },

  async useItem(userId: string, itemId: MarketItemId, targetUserId?: string): Promise<void> {
    const item = getMarketItem(itemId);
    if (!item) throw new Error('Item bulunamadi.');

    if (itemId === 'freeze' || itemId === 'score_drop') {
      if (!targetUserId) throw new Error('ERR_TARGET_REQUIRED');
      const canUse = await this.canUseAttackToday(userId);
      if (!canUse) throw new Error('ERR_DAILY_ATTACK_LIMIT');

      await InventoryService.consumeItem(userId, itemId, 1);

      const attackerSnap = await getDoc(doc(db, 'users', userId));
      const attacker = attackerSnap.data() as { groupId?: string; username?: string } | undefined;
      if (!attacker?.groupId) throw new Error('Grup bulunamadi.');

      const leaderboard = await LeaderboardService.getGroupLeaderboard(attacker.groupId);
      const rank1 = leaderboard[0]?.userId;
      if (rank1 && rank1 === targetUserId) {
        const atkItem = getMarketItem(itemId)!;
        const extraCost = Math.floor(atkItem.cost * 0.5);
        await InventoryService.spendBrScore(userId, extraCost);
      }

      const shield = await EffectService.hasActiveEffect(targetUserId, 'shield');
      if (shield) {
        await EffectService.consumeOneUse(targetUserId, 'shield');
        await this.logTransaction({
          userId,
          targetUserId,
          itemId,
          actionType: 'blocked',
          message: 'Your Shield blocked an attack 🛡️',
        });
        await NotificationInboxService.pushShieldBlocked(
          targetUserId,
          userId,
          itemId
        ).catch(() => {});
        if (itemId === 'score_drop') {
          throw new Error('ERR_SCORE_DROP_BLOCKED');
        }
        throw new Error('ERR_FREEZE_BLOCKED');
      }

      const targetRef = doc(db, 'users', targetUserId);
      const targetSnap = await getDoc(targetRef);
      const targetPoints =
        (targetSnap.data() as { points?: number } | undefined)?.points ?? 0;
      if (targetPoints <= 0) {
        await this.logTransaction({
          userId,
          targetUserId,
          itemId,
          actionType: 'blocked',
          message: 'Target has 0 points; attack blocked',
        });
        throw new Error('ERR_ATTACK_TARGET_ZERO_POINTS');
      }

      await this.applyAttack(userId, targetUserId, itemId, attacker);
    } else {
      await this.validateSelfUse(userId, itemId);
      await InventoryService.consumeItem(userId, itemId, 1);
      await this.applySelfEffect(userId, itemId);
      await this.logTransaction({
        userId,
        itemId,
        actionType: 'use',
        message: `${item.title} aktif edildi.`,
      });
    }
  },

  async validateSelfUse(userId: string, itemId: MarketItemId): Promise<void> {
    if (itemId === 'double_points') {
      const existing = await EffectService.hasActiveEffect(userId, 'double_points');
      if (existing) {
        throw new Error('ERR_DOUBLE_POINTS_ACTIVE');
      }
      return;
    }
    if (itemId === 'streak_saver') {
      const existing = await EffectService.hasActiveEffect(userId, 'streak_saver');
      if (existing) {
        throw new Error('ERR_STREAK_SAVER_ACTIVE');
      }
    }
  },

  async applySelfEffect(userId: string, itemId: MarketItemId): Promise<void> {
    if (itemId === 'shield') {
      await EffectService.addEffect(userId, {
        type: 'shield',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        usesLeft: 1,
      });
      return;
    }
    if (itemId === 'streak_saver') {
      await EffectService.addEffect(userId, {
        type: 'streak_saver',
        usesLeft: 1,
      });
      return;
    }
    if (itemId === 'double_points') {
      await EffectService.addEffect(userId, {
        type: 'double_points',
        usesLeft: 1,
      });
      return;
    }
    if (itemId === 'rank_booster') {
      await EffectService.addEffect(userId, {
        type: 'rank_booster',
        expiresAt: Date.now() + 48 * 60 * 60 * 1000,
        usesLeft: 1,
      });
      return;
    }
  },

  async applyAttack(
    userId: string,
    targetUserId: string,
    itemId: 'freeze' | 'score_drop',
    attacker: { groupId?: string; username?: string }
  ): Promise<void> {
    if (userId === targetUserId) throw new Error('Kendine saldiri yapamazsin.');
    if (!attacker?.groupId) throw new Error('Grup bulunamadi.');

    if (itemId === 'freeze') {
      await EffectService.addEffect(targetUserId, {
        type: 'frozen',
        expiresAt: Date.now() + 2 * 60 * 60 * 1000,
        sourceUserId: userId,
      });
      await this.logTransaction({
        userId,
        targetUserId,
        itemId,
        actionType: 'use',
        message: `${attacker.username ?? 'Bir oyuncu'} used Freeze on you ❄️`,
      });
      return;
    }

    const targetRef = doc(db, 'users', targetUserId);
    const targetSnap = await getDoc(targetRef);
    const targetData = targetSnap.data() as { points?: number } | undefined;
    const current = targetData?.points ?? 0;
    const drop = Math.min(10, current);
    await updateDoc(targetRef, { points: increment(-drop) });
    await this.logTransaction({
      userId,
      targetUserId,
      itemId,
      actionType: 'use',
      message: `${attacker.username ?? 'Bir oyuncu'} used Score Drop on you 📉`,
    });
  },

  async getRecentEvents(userId: string): Promise<MarketTransaction[]> {
    const q1 = query(txCol, where('userId', '==', userId));
    const q2 = query(txCol, where('targetUserId', '==', userId));
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const all = [...s1.docs, ...s2.docs].map((d) => ({ id: d.id, ...(d.data() as Omit<MarketTransaction, 'id'>) }));
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
  },

  async logTransaction(input: Omit<MarketTransaction, 'id' | 'timestamp'>): Promise<void> {
    await addDoc(txCol, { ...input, timestamp: Date.now() });
  },
};

