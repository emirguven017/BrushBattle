import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { UserStats, WeeklyLeaderboardEntry } from '../types';
import { getPreviousWeekKey, getWeekKey } from '../utils/week';
import { InventoryService } from './inventoryService';
import { EffectService } from './effectService';
import { NotificationService, getStoredLanguage } from './NotificationService';
import { translations, type Language } from '../i18n/translations';

function notifT(key: string, lang: Language, vars?: Record<string, string>): string {
  let s = translations[lang][key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
  return s;
}

const wlCol = collection(db, 'weeklyLeaderboard');

const weeklyId = (weekKey: string, groupId: string, userId: string) =>
  `${weekKey}_${groupId}_${userId}`;

export const WeeklyRewardService = {
  async addWeeklyPoints(input: {
    weekKey?: string;
    groupId?: string;
    userId: string;
    username: string;
    streak: number;
    points: number;
  }): Promise<void> {
    const weekKey = input.weekKey ?? getWeekKey();
    if (!input.groupId || input.points <= 0) return;
    const id = weeklyId(weekKey, input.groupId, input.userId);
    const ref = doc(db, 'weeklyLeaderboard', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        weekKey,
        groupId: input.groupId,
        userId: input.userId,
        username: input.username,
        weeklyPoints: input.points,
        streak: input.streak ?? 0,
        completedSessions: 1,
      });
      return;
    }
    await updateDoc(ref, {
      weeklyPoints: increment(input.points),
      streak: input.streak ?? 0,
      completedSessions: increment(1),
    });
  },

  async getWeeklyLeaderboard(groupId: string, weekKey = getWeekKey()): Promise<WeeklyLeaderboardEntry[]> {
    try {
      const q = query(wlCol, where('groupId', '==', groupId), where('weekKey', '==', weekKey));
      const snap = await getDocs(q);
      const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WeeklyLeaderboardEntry, 'id'>) }));
      return rows.sort((a, b) => {
        if (b.weeklyPoints !== a.weeklyPoints) return b.weeklyPoints - a.weeklyPoints;
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.completedSessions - a.completedSessions;
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : '';
      if (msg.includes('missing or insufficient permissions') || msg.includes('offline')) {
        return [];
      }
      throw e;
    }
  },

  async settleGroupWeeklyRewards(groupId: string): Promise<void> {
    const current = getWeekKey();
    const prev = getPreviousWeekKey();
    if (current === prev) return;

    const metaRef = doc(db, 'weeklyMeta', groupId);
    const metaSnap = await getDoc(metaRef);
    const lastSettledWeek = (metaSnap.data() as { lastSettledWeek?: string } | undefined)?.lastSettledWeek;
    if (lastSettledWeek === prev) return;

    const ranking = await this.getWeeklyLeaderboard(groupId, prev);
    if (ranking.length === 0) {
      await setDoc(metaRef, { groupId, lastSettledWeek: prev, lastResetAt: Date.now() }, { merge: true });
      return;
    }

    const top3 = ranking.slice(0, 3);
    const champion = top3[0];
    const second = top3[1];
    const third = top3[2];

    const lang = await getStoredLanguage();

    if (champion) {
      await InventoryService.addBrScore(champion.userId, 50);
      await this.addBadge(champion.userId, '👑 Weekly Champion');
      await EffectService.removeEffectsOfType(champion.userId, 'bonus_points');
      await EffectService.removeEffectsOfType(champion.userId, 'champion_crown');
      await EffectService.addEffect(champion.userId, {
        type: 'bonus_points',
        meta: { multiplier: 1.1 },
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      await EffectService.addEffect(champion.userId, {
        type: 'champion_crown',
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      });
      await this.bumpWins(champion.userId);
      await NotificationService.notifyMarketEvent(notifT('notifWeeklyReward', lang), notifT('notifNewChampion', lang));
    }
    if (second) {
      await InventoryService.addBrScore(second.userId, 30);
      await this.addBadge(second.userId, '🥈 Weekly Elite');
      await NotificationService.notifyMarketEvent(notifT('notifWeeklyReward', lang), notifT('notifFinishedSecond', lang));
    }
    if (third) {
      await InventoryService.addBrScore(third.userId, 20);
      await this.addBadge(third.userId, '🥉 Top Performer');
    }

    if (champion) {
      const crownMsg = notifT('notifCrownLost', lang, { username: champion.username });
      for (const row of ranking.slice(1)) {
        await NotificationService.notifyMarketEvent(notifT('notifCrownUpdate', lang), crownMsg);
        if (row.userId === champion.userId) break;
      }
    }

    await setDoc(metaRef, { groupId, lastSettledWeek: prev, lastResetAt: Date.now() }, { merge: true });
  },

  async addBadge(userId: string, badge: string): Promise<void> {
    const ref = doc(db, 'userStats', userId);
    const snap = await getDoc(ref);
    const base: UserStats = snap.exists()
      ? (snap.data() as UserStats)
      : { userId, totalWins: 0, badges: [] };
    const badges = base.badges.includes(badge) ? base.badges : [...base.badges, badge];
    await setDoc(ref, { ...base, badges }, { merge: true });
  },

  async bumpWins(userId: string): Promise<void> {
    const ref = doc(db, 'userStats', userId);
    const snap = await getDoc(ref);
    const base: UserStats = snap.exists()
      ? (snap.data() as UserStats)
      : { userId, totalWins: 0, badges: [] };
    await setDoc(
      ref,
      {
        ...base,
        totalWins: (base.totalWins ?? 0) + 1,
        lastWinDate: Date.now(),
      },
      { merge: true }
    );
  },

  async getUserStats(userId: string): Promise<UserStats> {
    const ref = doc(db, 'userStats', userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const init: UserStats = { userId, totalWins: 0, badges: [] };
      await setDoc(ref, init);
      return init;
    }
    return snap.data() as UserStats;
  },

  async syncUsernameAcrossWeeklyEntries(userId: string, username: string): Promise<void> {
    const normalized = username.trim();
    if (!normalized) return;
    try {
      const q = query(wlCol, where('userId', '==', userId));
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((d) => updateDoc(doc(db, 'weeklyLeaderboard', d.id), { username: normalized }))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : '';
      // Bazı eski haftalik kayitlara erişim izni olmayabilir; ayarlar kaydini engelleme.
      if (msg.includes('missing or insufficient permissions') || msg.includes('offline')) return;
      throw e;
    }
  }
};

