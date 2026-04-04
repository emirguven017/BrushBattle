import type { BrushSession, SessionType, User } from '../types';
import { BrushingService } from '../services/BrushingService';

const MIN_SAMPLES_TYPICAL = 2;
const MIN_LATE_SAMPLES = 3;
const LATE_SAMPLE_THRESHOLD_MIN = 20;
const AVG_LATE_SHOW_THRESHOLD_MIN = 35;
const MAX_SHIFT_MIN = 120;
const SHIFT_ROUND_MIN = 15;

function scheduledMs(dateStr: string, timeStr: string): number | null {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const [h, mi] = timeStr.split(':').map(Number);
  if (!y || !mo || !da) return null;
  const ms = new Date(y, mo - 1, da, h || 0, mi || 0, 0, 0).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function addMinutesToTimeStr(timeStr: string, addMin: number): string {
  const [h0, m0] = timeStr.split(':').map(Number);
  let total = (h0 || 0) * 60 + (m0 || 0) + addMin;
  total = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function roundToStep(n: number, step: number): number {
  return Math.round(n / step) * step;
}

export type TypicalBrushLine = { type: SessionType; timeHHmm: string };

export type LateBrushSuggestion = {
  type: SessionType;
  avgLateMinutes: number;
  currentSchedule: string;
  suggestedSchedule: string;
};

export function mergeSessionsById(a: BrushSession[], b: BrushSession[]): BrushSession[] {
  const map = new Map<string, BrushSession>();
  for (const s of b) map.set(s.id, s);
  for (const s of a) map.set(s.id, s);
  return Array.from(map.values());
}

/**
 * Son `sinceMs` sonrası tamamlanan seanslara göre tipik bitiş saatleri ve geç kalma önerileri.
 */
export function computeBrushingInsights(
  sessions: BrushSession[],
  user: User,
  plannedTypes: SessionType[],
  sinceMs: number
): { typical: TypicalBrushLine[]; late: LateBrushSuggestion[] } {
  const completed = sessions.filter(
    (s) =>
      s.status === 'completed' &&
      typeof s.completedAt === 'number' &&
      s.completedAt >= sinceMs &&
      plannedTypes.includes(s.sessionType)
  );

  const typical: TypicalBrushLine[] = [];
  const late: LateBrushSuggestion[] = [];

  for (const type of plannedTypes) {
    const typeDone = completed.filter((s) => s.sessionType === type);

    if (typeDone.length >= MIN_SAMPLES_TYPICAL) {
      const minuteOfDays = typeDone
        .map((s) => {
          const d = new Date(s.completedAt!);
          return d.getHours() * 60 + d.getMinutes();
        })
        .sort((a, b) => a - b);
      const mid = minuteOfDays[Math.floor(minuteOfDays.length / 2)]!;
      const hh = Math.floor(mid / 60);
      const mm = mid % 60;
      typical.push({
        type,
        timeHHmm: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
      });
    }

    const delaysMin: number[] = [];
    const planStr = BrushingService.getScheduledTimeForSessionType(user, type);
    for (const s of typeDone) {
      const timeStr = s.scheduledTime ?? planStr;
      const sm = scheduledMs(s.date, timeStr);
      if (sm === null) continue;
      const lateMin = (s.completedAt! - sm) / 60000;
      if (lateMin >= LATE_SAMPLE_THRESHOLD_MIN) delaysMin.push(lateMin);
    }

    if (delaysMin.length >= MIN_LATE_SAMPLES) {
      const avg = delaysMin.reduce((a, b) => a + b, 0) / delaysMin.length;
      if (avg >= AVG_LATE_SHOW_THRESHOLD_MIN) {
        const shift = Math.min(
          MAX_SHIFT_MIN,
          Math.max(SHIFT_ROUND_MIN, roundToStep(avg, SHIFT_ROUND_MIN))
        );
        late.push({
          type,
          avgLateMinutes: Math.round(avg),
          currentSchedule: planStr,
          suggestedSchedule: addMinutesToTimeStr(planStr, shift),
        });
      }
    }
  }

  late.sort((a, b) => b.avgLateMinutes - a.avgLateMinutes);
  return { typical, late: late.slice(0, 2) };
}
