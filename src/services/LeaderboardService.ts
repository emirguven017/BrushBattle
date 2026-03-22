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

  /** Tüm grup üyelerini haftalık sıralamada gösterir; fırçalamamış olanlar 0 puanla listelenir */
  async getGroupWeeklyLeaderboard(groupId: string): Promise<LeaderboardRanking[]> {
    const [usersSnap, weeklyList] = await Promise.all([
      getDocs(query(collection(db, 'users'), where('groupId', '==', groupId))),
      WeeklyRewardService.getWeeklyLeaderboard(groupId)
    ]);
    const users: User[] = usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as User));
    const weeklyMap = new Map(weeklyList.map((r) => [r.userId, r]));

    return users
      .map((u) => {
        const w = weeklyMap.get(u.id);
        const weeklyPts = w?.weeklyPoints ?? 0;
        const totalPts = u.points ?? 0;
        return {
          userId: u.id,
          username: u.username,
          points: weeklyPts > 0 ? weeklyPts : totalPts,
          streak: w?.streak ?? u.streak ?? 0,
          completedSessions: w?.completedSessions ?? 0,
        };
      })
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.streak !== a.streak) return b.streak - a.streak;
        return b.completedSessions - a.completedSessions;
      });
  },
};


