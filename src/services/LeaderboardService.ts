import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { LeaderboardRanking, User } from '../types';
import { EffectService } from './effectService';
import { WeeklyRewardService } from './weeklyRewardService';

export const LeaderboardService = {
  async getGroupLeaderboard(groupId: string): Promise<LeaderboardRanking[]> {
    const q = query(collection(db, 'users'), where('groupId', '==', groupId));
    const snap = await getDocs(q);

    const users: User[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));

    const boosterMap = new Map<string, boolean>();
    await Promise.all(
      users.map(async (u) => {
        const hasBooster = await EffectService.hasActiveEffect(u.id, 'rank_booster');
        boosterMap.set(u.id, Boolean(hasBooster));
      })
    );

    const rankings: LeaderboardRanking[] = users
      .map(u => ({
        userId: u.id,
        username: u.username,
        points: u.points,
        streak: u.streak,
        completedSessions: 0 // İleride brushSessions üzerinden hesaplanabilir
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aBoost = boosterMap.get(a.userId) ? 1 : 0;
        const bBoost = boosterMap.get(b.userId) ? 1 : 0;
        if (bBoost !== aBoost) return bBoost - aBoost;
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.completedSessions - a.completedSessions;
      });

    return rankings;
  },

  async getGroupWeeklyLeaderboard(groupId: string): Promise<LeaderboardRanking[]> {
    const list = await WeeklyRewardService.getWeeklyLeaderboard(groupId);
    return list.map((r) => ({
      userId: r.userId,
      username: r.username,
      points: r.weeklyPoints,
      streak: r.streak,
      completedSessions: r.completedSessions,
    }));
  },
};


