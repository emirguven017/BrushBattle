import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import { dateKey } from '../utils/date';

export type DayStatus = 'full' | 'partial' | 'missed' | 'empty';

export interface DayData {
  date: string; // YYYY-MM-DD
  status: DayStatus;
  morningCompleted?: boolean;
  eveningCompleted?: boolean;
  pointsEarned?: number;
}

interface CalendarViewProps {
  /** Map of date string to day data */
  days: Record<string, DayData>;
  currentMonth: Date;
  onMonthChange: (delta: number) => void;
  onDayPress: (day: DayData) => void;
}

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  days,
  currentMonth,
  onMonthChange,
  onDayPress
}) => {
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
        {cells.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.cell, { backgroundColor: getBgColor(day) }]}
            onPress={() => day && onDayPress(day)}
            disabled={!day}
          >
            <Text style={styles.cellText}>
              {day ? new Date(day.date).getDate() : ''}
            </Text>
          </TouchableOpacity>
        ))}
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
  cellText: { fontSize: 14, fontWeight: '600', color: colors.text }
});
