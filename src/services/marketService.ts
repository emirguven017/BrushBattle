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

const txCol = collection(db, 'transactions');

const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const attackItems: MarketItemId[] = ['freeze', 'score_drop'];

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
    const q = query(
      txCol,
      where('userId', '==', userId),
      where('actionType', '==', 'use'),
      where('timestamp', '>=', startOfDay())
    );
    const snap = await getDocs(q);
    const count = snap.docs
      .map((d) => d.data() as Omit<MarketTransaction, 'id'>)
      .filter((t) => attackItems.includes(t.itemId)).length;
    return count < 2;
  },

  async useItem(userId: string, itemId: MarketItemId, targetUserId?: string): Promise<void> {
    const item = getMarketItem(itemId);
    if (!item) throw new Error('Item bulunamadi.');
    await InventoryService.consumeItem(userId, itemId, 1);

    if (itemId === 'freeze' || itemId === 'score_drop') {
      if (!targetUserId) throw new Error('Saldiri icin hedef secmelisin.');
      const canUse = await this.canUseAttackToday(userId);
      if (!canUse) throw new Error('Gunluk saldiri limitine ulastin (2).');
      await this.applyAttack(userId, targetUserId, itemId);
    } else {
      await this.applySelfEffect(userId, itemId);
      await this.logTransaction({
        userId,
        itemId,
        actionType: 'use',
        message: `${item.title} aktif edildi.`,
      });
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
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        usesLeft: 1,
      });
      return;
    }
  },

  async applyAttack(userId: string, targetUserId: string, itemId: 'freeze' | 'score_drop'): Promise<void> {
    if (userId === targetUserId) throw new Error('Kendine saldiri yapamazsin.');

    const attackerSnap = await getDoc(doc(db, 'users', userId));
    const attacker = attackerSnap.data() as { groupId?: string; username?: string } | undefined;
    if (!attacker?.groupId) throw new Error('Grup bulunamadi.');

    // Rank #1 hedefe ekstra maliyet (x1.5 -> +%50)
    const leaderboard = await LeaderboardService.getGroupLeaderboard(attacker.groupId);
    const rank1 = leaderboard[0]?.userId;
    if (rank1 && rank1 === targetUserId) {
      const item = getMarketItem(itemId)!;
      const extraCost = Math.floor(item.cost * 0.5);
      await InventoryService.spendBrScore(userId, extraCost);
    }

    // Shield kontrolu
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
      return;
    }

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

