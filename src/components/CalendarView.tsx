import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import { dateKey, todayKey } from '../utils/date';
import { useLanguage } from '../context/LanguageContext';

export type DayStatus = 'full' | 'partial' | 'missed' | 'empty';

export interface DayData {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  morningCompleted?: boolean;
  eveningCompleted?: boolean;
  pointsEarned?: number;
  /** Diş fırçası son değiştirildiği gün (takvimde mavi nokta) */
  toothbrushLastChange?: boolean;
  /** Planlanan bir sonraki fırça değişim günü (takvimde turuncu nokta) */
  toothbrushNextDue?: boolean;
}

interface CalendarViewProps {
  /** Map of date string to day data */
  days: Record<string, DayData>;
  currentMonth: Date;
  onMonthChange: (delta: number) => void;
  onDayPress: (day: DayData) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  days,
  currentMonth,
  onMonthChange,
  onDayPress
}) => {
  const { t } = useLanguage();
  const WEEKDAYS = t('weekdaysShort').split(',');
  const MONTHS = t('months').split(',');
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const cells: (DayData | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = dateKey(new Date(year, month, d));
    cells.push(days[key] ?? { date: key, status: 'empty' });
  }

  const getBgColor = (day: DayData | null) => {
    if (!day || day.status === 'empty') return colors.background;
    if (day.status === 'full') return colors.success;
    if (day.status === 'partial') return colors.warning;
    return colors.error;
  };

  const today = todayKey();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onMonthChange(-1)} style={styles.arrow}>
          <Text style={styles.arrowText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.month}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={() => onMonthChange(1)} style={styles.arrow}>
          <Text style={styles.arrowText}>→</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.weekdays}>
        {WEEKDAYS.map(w => (
          <Text key={w} style={styles.weekdayLabel}>{w}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((day, i) => {
          const isToday = day?.date === today;
          const tbLast = day?.toothbrushLastChange;
          const tbNext = day?.toothbrushNextDue;
          const hasTb = !!(tbLast || tbNext);
          return (
            <TouchableOpacity
              key={i}
              style={[
                styles.cell,
                { backgroundColor: getBgColor(day) },
                isToday && styles.todayCell
              ]}
              onPress={() => day && onDayPress(day)}
              disabled={!day}
            >
              {day ? (
                <View style={styles.cellInner}>
                  <Text style={[styles.cellText, isToday && styles.todayCellText]}>
                    {new Date(day.date + 'T12:00:00').getDate()}
                  </Text>
                  {hasTb ? (
                    <View style={styles.tbMarkerRow}>
                      {tbLast ? (
                        <View style={[styles.tbMarkerDot, { backgroundColor: colors.accent }]} />
                      ) : null}
                      {tbNext ? (
                        <View style={[styles.tbMarkerDot, { backgroundColor: colors.warning }]} />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  arrow: { padding: 8 },
  arrowText: { fontSize: 20, fontWeight: '700', color: colors.primary },
  month: { fontSize: 18, fontWeight: '700', color: colors.text },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 8
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4
  },
  cellInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  tbMarkerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minHeight: 5
  },
  tbMarkerDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 6
  },
  cellText: { fontSize: 14, fontWeight: '600', color: colors.text },
  todayCellText: { fontWeight: '800' }
});
