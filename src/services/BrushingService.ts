import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { BrushSession, SessionType, User } from '../types';
import { todayKey, dateKey } from '../utils/date';
import { InventoryService } from './inventoryService';
import { EffectService } from './effectService';
import { MarketService } from './marketService';
import { WeeklyRewardService } from './weeklyRewardService';

const SESSION_POINTS = 10;
const DAILY_BONUS_POINTS = 10;
const SESSION_BR = 5;
const DAILY_BONUS_BR = 10;

const STREAK_BONUSES: Record<number, number> = {
  3: 15,
  7: 30,
  30: 100
};

const STREAK_BR_BONUSES: Record<number, number> = {
  3: 10,
  7: 20
};

export const BrushingService = {
  async getTodaySessions(userId: string): Promise<BrushSession[]> {
    const q = query(
      collection(db, 'brushSessions'),
      where('userId', '==', userId),
      where('date', '==', todayKey())
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BrushSession, 'id'>) }));
  },

  async getSessionsForMonth(userId: string, year: number, month: number): Promise<BrushSession[]> {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    const q = query(
      collection(db, 'brushSessions'),
      where('userId', '==', userId),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BrushSession, 'id'>) }));
  },

  async startSession(user: User, sessionType: SessionType): Promise<BrushSession> {
    const existingToday = await this.getTodaySessions(user.id);
    const existing = existingToday.find(s => s.sessionType === sessionType);

    if (existing) {
      // pending ya da missed seans zaten varsa onu kullan
      return existing;
    }

    const base = {
      userId: user.id,
      date: todayKey(),
      sessionType,
      status: 'pending',
      pointsEarned: 0,
      dayBonusApplied: false
    } as Omit<BrushSession, 'id'>;

    const ref = await addDoc(collection(db, 'brushSessions'), base);
    return { id: ref.id, ...base };
  },

  async completeSession(session: BrushSession, user: User): Promise<void> {
    // Seans zaten tamamlanmışsa tekrar puan vermeyelim
    if (session.status === 'completed') return;

    const sessionRef = doc(db, 'brushSessions', session.id);

    const userRef = doc(db, 'users', user.id);
    const frozen = await EffectService.hasActiveEffect(user.id, 'frozen');
    const hasDoublePoints = await EffectService.hasActiveEffect(user.id, 'double_points');
    const weeklyBuff = await EffectService.hasActiveEffect(user.id, 'bonus_points');
    const pointMultiplier = hasDoublePoints ? 2 : 1;
    const extraMultiplier = Number(weeklyBuff?.meta?.multiplier ?? 1);
    const pointsToGrant = frozen ? 0 : Math.round(SESSION_POINTS * pointMultiplier * extraMultiplier);

    // Comeback mekanigi: dusuk puanli kullanicilar ufak BR destegi alir.
    const comebackBr = (user.points ?? 0) < 100 ? 2 : 0;

    await updateDoc(sessionRef, {
      status: 'completed',
      completedAt: Date.now(),
      pointsEarned: pointsToGrant
    });

    // Kullanıcıya seans puanı ekle
    if (pointsToGrant > 0) {
      await updateDoc(userRef, { points: increment(pointsToGrant) });
      await WeeklyRewardService.addWeeklyPoints({
        groupId: user.groupId,
        userId: user.id,
        username: user.username,
        streak: user.streak ?? 0,
        points: pointsToGrant,
      });
    }
    await InventoryService.addBrScore(user.id, SESSION_BR + comebackBr);
    await MarketService.logTransaction({
      userId: user.id,
      itemId: 'double_points',
      actionType: 'reward',
      message: `Brushing reward: +${SESSION_BR + comebackBr} BR`,
    });
    if (hasDoublePoints) {
      await EffectService.consumeOneUse(user.id, 'double_points');
    }

    // Gün içindeki iki seans da tamamlandı mı kontrol et
    const todaySessions = await this.getTodaySessions(user.id);
    const morningDone = todaySessions.find(
      s => s.sessionType === 'morning' && s.status === 'completed'
    );
    const eveningDone = todaySessions.find(
      s => s.sessionType === 'evening' && s.status === 'completed'
    );

    const bothCompleted = Boolean(morningDone && eveningDone);

    if (bothCompleted) {
      // Günlük bonus daha önce uygulanmadıysa uygula
      const bonusCarrier = eveningDone; // akşam seansı üzerinde flag tutalım
      if (bonusCarrier && !bonusCarrier.dayBonusApplied) {
        await updateDoc(userRef, { points: increment(DAILY_BONUS_POINTS) });
        await WeeklyRewardService.addWeeklyPoints({
          groupId: user.groupId,
          userId: user.id,
          username: user.username,
          streak: user.streak ?? 0,
          points: DAILY_BONUS_POINTS,
        });
        await InventoryService.addBrScore(user.id, DAILY_BONUS_BR);
        await updateDoc(doc(db, 'brushSessions', bonusCarrier.id), {
          dayBonusApplied: true
        });

        // Streak güncelle
        const userSnap = await getDoc(userRef);
        const fresh = userSnap.data() as User | undefined;
        const currentStreak = fresh?.streak ?? user.streak ?? 0;
        const newStreak = currentStreak + 1;
        await updateDoc(userRef, { streak: newStreak });

        // Streak bonusları
        const streakBonus = STREAK_BONUSES[newStreak];
        if (streakBonus) {
          await updateDoc(userRef, { points: increment(streakBonus) });
        }
        const streakBrBonus = STREAK_BR_BONUSES[newStreak];
        if (streakBrBonus) {
          await InventoryService.addBrScore(user.id, streakBrBonus);
        }
      }
    }
  }
};


