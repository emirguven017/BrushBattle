import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors, ui } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    <View style={styles.outer}>
      <View style={styles.cardShell}>
        <View style={styles.accentBar} />
        <View style={styles.cardInner}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onMonthChange(-1)} style={styles.arrow}>
          <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.month}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={() => onMonthChange(1)} style={styles.arrow}>
          <Ionicons name="chevron-forward" size={22} color={colors.primaryDark} />
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
                isToday ? styles.todayCell : styles.cellPlain,
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
      </View>
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  outer: {
    paddingHorizontal: ui.screenPadding,
    paddingTop: 10,
    paddingBottom: 4,
  },
  cardShell: {
    borderRadius: ui.radiusLg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  accentBar: {
    height: 3,
    width: '100%',
    backgroundColor: colors.primary,
    opacity: 0.95,
  },
  cardInner: {
    paddingTop: 14,
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary + '30',
  },
  month: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  weekdays: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.background,
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  /** Bugün dışı: çerçeve / yuvarlak halka yok */
  cellPlain: {
    borderWidth: 0,
    borderRadius: 0,
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
    borderWidth: 2.5,
    borderColor: colors.primaryDark,
    borderRadius: 999,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 5,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  cellText: { fontSize: 14, fontWeight: '700', color: colors.text },
  todayCellText: { fontWeight: '800', color: colors.primaryDark },
});
