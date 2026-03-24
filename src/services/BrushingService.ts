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

const LATE_THRESHOLD_MS = 60 * 60 * 1000; // 1 saat
const EARLY_START_WINDOW_MS = 60 * 60 * 1000; // Seans saatinden en fazla 1 saat once

const toLocalScheduledMs = (dateStr: string, timeStr: string): number | null => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);
  if (!year || !month || !day) return null;
  const ms = new Date(year, month - 1, day, hour || 0, minute || 0, 0).getTime();
  return Number.isNaN(ms) ? null : ms;
};

/** Seans planlanan saatten 1 saatten fazla geç tamamlandıysa true. Yerel saatle karşılaştırır. */
const isSessionCompletedLate = (
  session: { date: string; sessionType: 'morning' | 'evening'; completedAt?: number; scheduledTime?: string },
  user: { morningTime?: string; eveningTime?: string }
): boolean => {
  try {
    const timeStr = session.scheduledTime
      ?? (session.sessionType === 'morning' ? (user.morningTime ?? '08:00') : (user.eveningTime ?? '21:00'));
    const parts = session.date.split('-');
    const [year, month, day] = parts.map(Number);
    const timeParts = timeStr.split(':');
    const hour = Number(timeParts[0]) || 0;
    const minute = Number(timeParts[1]) || 0;
    if (!year || !month || !day || parts.length < 3) return false;
    const scheduledMs = new Date(year, month - 1, day, hour, minute, 0).getTime();
    if (Number.isNaN(scheduledMs)) return false;
    const completedMs = session.completedAt ?? Date.now();
    return completedMs - scheduledMs > LATE_THRESHOLD_MS;
  } catch {
    return false; // Parse hatasında gecikme sayma, puan ver
  }
};

export const BrushingService = {
  async lockTodayScheduleForUser(user: User): Promise<void> {
    const todaySessions = await this.getTodaySessions(user.id);
    const typeToTime: Record<SessionType, string> = {
      morning: user.morningTime ?? '08:00',
      evening: user.eveningTime ?? '21:00'
    };

    for (const sessionType of ['morning', 'evening'] as const) {
      const existing = todaySessions.find((s) => s.sessionType === sessionType);
      if (!existing) {
        await addDoc(collection(db, 'brushSessions'), {
          userId: user.id,
          date: todayKey(),
          sessionType,
          scheduledTime: typeToTime[sessionType],
          status: 'pending',
          pointsEarned: 0,
          dayBonusApplied: false
        } as Omit<BrushSession, 'id'>);
        continue;
      }
      if (existing.status === 'completed') continue;
      if (!existing.scheduledTime) {
        await updateDoc(doc(db, 'brushSessions', existing.id), {
          scheduledTime: typeToTime[sessionType]
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

  /** Sabah + akşam tamamlanmış ve ikisi de vaktinde mi */
  isDayPerfect(sessions: BrushSession[], user: User): boolean {
    const morning = sessions.find(
      (s) => s.sessionType === 'morning' && s.status === 'completed'
    );
    const evening = sessions.find(
      (s) => s.sessionType === 'evening' && s.status === 'completed'
    );
    if (!morning || !evening) return false;
    return (
      !isSessionCompletedLate(morning, user) && !isSessionCompletedLate(evening, user)
    );
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
    const scheduleTime = sessionType === 'morning' ? (user.morningTime ?? '08:00') : (user.eveningTime ?? '21:00');
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

    // 1 saatten fazla geç tamamlandıysa puan ve BR verme (ama seans tamamlandı sayılır)
    const completedAt = Date.now();
    const lateSession = {
      date: session.date,
      sessionType: session.sessionType,
      scheduledTime: session.scheduledTime,
      completedAt
    };
    const isLate = isSessionCompletedLate(lateSession, user);

    const frozen = await EffectService.hasActiveEffect(user.id, 'frozen');
    const hasDoublePoints = await EffectService.hasActiveEffect(user.id, 'double_points');
    const weeklyBuff = await EffectService.hasActiveEffect(user.id, 'bonus_points');
    const pointMultiplier = hasDoublePoints ? 2 : 1;
    const extraMultiplier = Number(weeklyBuff?.meta?.multiplier ?? 1);
    const pointsToGrant = isLate || frozen ? 0 : Math.round(SESSION_POINTS * pointMultiplier * extraMultiplier);

    // Comeback mekanigi: dusuk puanli kullanicilar ufak BR destegi alir. Geç tamamlanmışsa BR yok.
    const comebackBr = isLate ? 0 : (user.points ?? 0) < 100 ? 2 : 0;
    const brToAdd = isLate ? 0 : SESSION_BR + comebackBr;
    let gainedPoints = pointsToGrant;
    let gainedBr = brToAdd;

    await updateDoc(sessionRef, {
      status: 'completed',
      completedAt,
      pointsEarned: pointsToGrant
    });

    // Kullanıcıya seans puanı ekle (geç tamamlanmışsa ekleme)
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

    // Gün içindeki iki seans da tamamlandı mı ve ikisi de vaktinde mi kontrol et
    const todaySessions = await this.getTodaySessions(user.id);
    const morningDone = todaySessions.find(
      s => s.sessionType === 'morning' && s.status === 'completed'
    );
    const eveningDone = todaySessions.find(
      s => s.sessionType === 'evening' && s.status === 'completed'
    );

    const bothCompleted = Boolean(morningDone && eveningDone);
    const morningOnTime = morningDone ? !isSessionCompletedLate(morningDone, user) : false;
    const eveningOnTime = eveningDone ? !isSessionCompletedLate(eveningDone, user) : false;
    const bothOnTime = morningOnTime && eveningOnTime;

    if (bothCompleted && bothOnTime) {
      // Günlük bonus daha önce uygulanmadıysa uygula (sadece ikisi de vaktinde tamamlandıysa)
      const bonusCarrier = eveningDone;
      if (bonusCarrier && !bonusCarrier.dayBonusApplied) {
        await updateDoc(userRef, { points: increment(DAILY_BONUS_POINTS) });
        gainedPoints += DAILY_BONUS_POINTS;
        await WeeklyRewardService.addWeeklyPoints({
          groupId: user.groupId,
          userId: user.id,
          username: user.username,
          streak: user.streak ?? 0,
          points: DAILY_BONUS_POINTS,
        });
        await InventoryService.addBrScore(user.id, DAILY_BONUS_BR);
        gainedBr += DAILY_BONUS_BR;
        await updateDoc(doc(db, 'brushSessions', bonusCarrier.id), {
          dayBonusApplied: true
        });

        // Streak: kırılma → 0 + ceza modu; ceza -1/-2/-3; -3 sonrası 0 ve normal artış
        const userSnap = await getDoc(userRef);
        const fresh = userSnap.data() as User | undefined;
        let S = fresh?.streak ?? user.streak ?? 0;
        let P = Boolean(fresh?.streakPenaltyMode);

        const yesterdaySessions = await this.getSessionsForDate(user.id, yesterdayKey());
        const yesterdayPerfect = this.isDayPerfect(yesterdaySessions, user);

        const yesterdayMorningDone = yesterdaySessions.some(
          (s) => s.sessionType === 'morning' && s.status === 'completed'
        );
        const yesterdayEveningDone = yesterdaySessions.some(
          (s) => s.sessionType === 'evening' && s.status === 'completed'
        );
        const yesterdayNothingCompleted = !yesterdayMorningDone && !yesterdayEveningDone;

        let yesterdayPerfectEffective = yesterdayPerfect;
        if (!yesterdayPerfect && S === 0 && !P && yesterdayNothingCompleted) {
          yesterdayPerfectEffective = true;
        }

        if (!yesterdayPerfect && S > 0) {
          const saver = await EffectService.hasActiveEffect(user.id, 'streak_saver');
          if (saver) {
            await EffectService.consumeOneUse(user.id, 'streak_saver');
            yesterdayPerfectEffective = true;
          } else {
            S = 0;
            P = true;
            await updateDoc(userRef, { streak: 0, streakPenaltyMode: true });
          }
        }

        let newStreak: number;
        let newP = P;

        if (P) {
          if (S === 0) {
            newStreak = -1;
          } else if (S < 0) {
            if (S === -3) {
              newStreak = 0;
              newP = false;
            } else {
              newStreak = S - 1;
            }
          } else {
            newStreak = S + 1;
            newP = false;
          }
        } else if (S < 0) {
          newStreak = 0;
        } else if (yesterdayPerfectEffective) {
          newStreak = S + 1;
        } else {
          newStreak = S;
        }

        await updateDoc(userRef, { streak: newStreak, streakPenaltyMode: newP });

        // Streak bonusları (yalnızca pozitif milestone)
        if (newStreak > 0) {
          const streakBonus = STREAK_BONUSES[newStreak];
          if (streakBonus) {
            await updateDoc(userRef, { points: increment(streakBonus) });
            gainedPoints += streakBonus;
          }
          const streakBrBonus = STREAK_BR_BONUSES[newStreak];
          if (streakBrBonus) {
            await InventoryService.addBrScore(user.id, streakBrBonus);
            gainedBr += streakBrBonus;
          }
        }
      }
    }
    return { points: gainedPoints, br: gainedBr };
  }
};


