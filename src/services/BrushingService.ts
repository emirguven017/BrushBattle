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
import { todayKey, yesterdayKey } from '../utils/date';
import { InventoryService } from './inventoryService';
import { EffectService } from './effectService';
import { MarketService } from './marketService';
import { WeeklyRewardService } from './weeklyRewardService';

const DAILY_MAX_POINTS = 18;
const SESSION_BR = 5;

const EARLY_START_WINDOW_MS = 60 * 60 * 1000; // Seans saatinden en fazla 1 saat once

const toLocalScheduledMs = (dateStr: string, timeStr: string): number | null => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  if (!year || !month || !day) return null;
  const ms = new Date(year, month - 1, day, hour || 0, minute || 0, 0).getTime();
  return Number.isNaN(ms) ? null : ms;
};

export const BrushingService = {
  getPlannedSessionTypesForUser(user: User): SessionType[] {
    const count = Math.min(3, Math.max(1, Number(user.dailySessionCount ?? 2)));
    if (count === 1) return ['morning'];
    if (count === 2) return ['morning', 'evening'];
    return ['morning', 'midday', 'evening'];
  },

  getScheduledTimeForSessionType(user: User, sessionType: SessionType): string {
    if (sessionType === 'morning') return user.morningTime ?? '08:00';
    if (sessionType === 'midday') return user.middayTime ?? '14:00';
    return user.eveningTime ?? '21:00';
  },

  getSessionPointsForUser(user: User): number {
    const count = Math.min(3, Math.max(1, Number(user.dailySessionCount ?? 2)));
    return Math.max(1, Math.floor(DAILY_MAX_POINTS / count));
  },

  async lockTodayScheduleForUser(user: User): Promise<void> {
    const todaySessions = await this.getTodaySessions(user.id);
    const plannedTypes = this.getPlannedSessionTypesForUser(user);

    for (const sessionType of plannedTypes) {
      const existing = todaySessions.find((s) => s.sessionType === sessionType);
      const scheduledTime = this.getScheduledTimeForSessionType(user, sessionType);
      if (!existing) {
        await addDoc(collection(db, 'brushSessions'), {
          userId: user.id,
          date: todayKey(),
          sessionType,
          scheduledTime,
          status: 'pending',
          pointsEarned: 0,
          dayBonusApplied: false
        } as Omit<BrushSession, 'id'>);
        continue;
      }
      if (existing.status === 'completed') continue;
      if (!existing.scheduledTime) {
        await updateDoc(doc(db, 'brushSessions', existing.id), {
          scheduledTime
        });
      }
    }
  },

  async getTodaySessions(userId: string): Promise<BrushSession[]> {
    const q = query(
      collection(db, 'brushSessions'),
      where('userId', '==', userId),
      where('date', '==', todayKey())
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<BrushSession, 'id'>) }));
  },

  async getSessionsForDate(userId: string, dateStr: string): Promise<BrushSession[]> {
    const q = query(
      collection(db, 'brushSessions'),
      where('userId', '==', userId),
      where('date', '==', dateStr)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<BrushSession, 'id'>) }));
  },

  /** Planlı seansların tamamı tamamlanmış mı */
  isDayPerfect(sessions: BrushSession[], user: User): boolean {
    const plannedTypes = this.getPlannedSessionTypesForUser(user);
    if (plannedTypes.length === 0) return false;
    return plannedTypes.every((type) => {
      const session = sessions.find((s) => s.sessionType === type && s.status === 'completed');
      return Boolean(session);
    });
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
    const plannedTypes = this.getPlannedSessionTypesForUser(user);
    if (!plannedTypes.includes(sessionType)) {
      const err = new Error('SESSION_NOT_IN_PLAN');
      (err as Error & { code?: string }).code = 'SESSION_NOT_IN_PLAN';
      throw err;
    }
    const scheduleTime = this.getScheduledTimeForSessionType(user, sessionType);
    const scheduledMs = toLocalScheduledMs(todayKey(), scheduleTime);
    if (scheduledMs !== null && Date.now() < scheduledMs - EARLY_START_WINDOW_MS) {
      const err = new Error('TOO_EARLY_TO_START');
      (err as Error & { code?: string }).code = 'TOO_EARLY_TO_START';
      throw err;
    }

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
      scheduledTime: scheduleTime,
      status: 'pending',
      pointsEarned: 0,
      dayBonusApplied: false
    } as Omit<BrushSession, 'id'>;

    const ref = await addDoc(collection(db, 'brushSessions'), base);
    return { id: ref.id, ...base };
  },

  async completeSession(session: BrushSession, user: User): Promise<{ points: number; br: number }> {
    // Seans zaten tamamlanmışsa tekrar puan vermeyelim
    if (session.status === 'completed') return { points: 0, br: 0 };

    const sessionRef = doc(db, 'brushSessions', session.id);
    const userRef = doc(db, 'users', user.id);

    const completedAt = Date.now();

    const frozen = await EffectService.hasActiveEffect(user.id, 'frozen');
    const hasDoublePoints = await EffectService.hasActiveEffect(user.id, 'double_points');
    const weeklyBuff = await EffectService.hasActiveEffect(user.id, 'bonus_points');
    const pointMultiplier = hasDoublePoints ? 2 : 1;
    const extraMultiplier = Number(weeklyBuff?.meta?.multiplier ?? 1);
    const baseSessionPoints = this.getSessionPointsForUser(user);
    const pointsToGrant = frozen ? 0 : Math.round(baseSessionPoints * pointMultiplier * extraMultiplier);

    const brToAdd = SESSION_BR;
    let gainedPoints = pointsToGrant;
    let gainedBr = brToAdd;

    await updateDoc(sessionRef, {
      status: 'completed',
      completedAt,
      pointsEarned: pointsToGrant
    });

    // Kullanıcıya seans puanı ekle
    if (pointsToGrant > 0) {
      await updateDoc(userRef, { points: increment(pointsToGrant) });
      try {
        await WeeklyRewardService.addWeeklyPoints({
          groupId: user.groupId,
          userId: user.id,
          username: user.username,
          streak: user.streak ?? 0,
          points: pointsToGrant,
        });
      } catch {
        // Gruba yazma izni yoksa veya grup silinmişse devam et
      }
    }
    if (brToAdd > 0) {
      await InventoryService.addBrScore(user.id, brToAdd);
    }
    if (brToAdd > 0) {
      try {
        await MarketService.logTransaction({
          userId: user.id,
          itemId: 'double_points',
          actionType: 'reward',
          message: `Brushing reward: +${brToAdd} BR`,
        });
      } catch {
        // İşlem kaydı başarısız olsa da seans tamamlandı sayılır
      }
    }
    if (hasDoublePoints && pointsToGrant > 0) {
      try {
        await EffectService.consumeOneUse(user.id, 'double_points');
      } catch {
        // Etki tüketilemezse devam et
      }
    }

    // Gün içindeki planlı seansların tamamlanıp tamamlanmadığını kontrol et
    const todaySessions = await this.getTodaySessions(user.id);
    const plannedTypes = this.getPlannedSessionTypesForUser(user);
    const plannedSessions = plannedTypes
      .map((type) => todaySessions.find((s) => s.sessionType === type))
      .filter((s): s is BrushSession => Boolean(s));
    const allCompleted = plannedSessions.length === plannedTypes.length
      && plannedSessions.every((s) => s.status === 'completed');

    if (allCompleted) {
      // Gün kapanış ödülleri aynı gün içinde yalnızca bir kez işlensin.
      const bonusCarrier = plannedSessions[plannedSessions.length - 1];
      if (bonusCarrier && !bonusCarrier.dayBonusApplied) {
        // Streak: Bugün tüm görevler tamamlandıysa artar; eksik gün varsa zincir kırılır.
        const userSnap = await getDoc(userRef);
        const fresh = userSnap.data() as User | undefined;
        const currentStreak = Math.max(0, fresh?.streak ?? user.streak ?? 0);

        const yesterdaySessions = await this.getSessionsForDate(user.id, yesterdayKey());
        const yesterdayPlannedTypes = this.getPlannedSessionTypesForUser(user);
        const yesterdayAllCompleted = yesterdayPlannedTypes.length > 0
          && yesterdayPlannedTypes.every((type) =>
            yesterdaySessions.some((s) => s.sessionType === type && s.status === 'completed')
          );

        const newStreak = yesterdayAllCompleted ? currentStreak + 1 : 0;
        await updateDoc(userRef, { streak: newStreak, streakPenaltyMode: false });

        await updateDoc(doc(db, 'brushSessions', bonusCarrier.id), {
          dayBonusApplied: true
        });
      }
    }
    return { points: gainedPoints, br: gainedBr };
  }
};


