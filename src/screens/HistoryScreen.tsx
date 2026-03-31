import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, headerTitle, ui } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import {
  CalendarView,
  type DayData,
  type DayStatus
} from '../components';
import { dateKey } from '../utils/date';

export const HistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState<Record<string, DayData>>({});
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const plannedCount = Math.min(3, Math.max(1, Number(user?.dailySessionCount ?? 2)));

  const loadMonth = async () => {
    if (!user) return;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    const sessions = await BrushingService.getSessionsForMonth(user.id, year, month);

    const map: Record<string, DayData> = {};
    const lastDay = new Date(year, month, 0).getDate();
    for (let d = 1; d <= lastDay; d++) {
      const key = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const daySessions = sessions.filter(s => s.date === key);
      const morning = daySessions.find(s => s.sessionType === 'morning');
      const evening = daySessions.find(s => s.sessionType === 'evening');
      const completedCount = daySessions.filter((s) => s.status === 'completed').length;
      const morningDone = morning?.status === 'completed';
      const eveningDone = evening?.status === 'completed';
      let status: DayStatus = 'empty';
      if (completedCount >= plannedCount) status = 'full';
      else if (completedCount > 0) status = 'partial';
      else if (daySessions.length > 0) status = 'missed';

      const points =
        daySessions.reduce((sum, s) => sum + (s.pointsEarned ?? 0), 0) +
        (daySessions.some((s) => s.dayBonusApplied) ? 10 : 0);

      map[key] = {
        date: key,
        status,
        morningCompleted: morningDone,
        eveningCompleted: eveningDone,
        pointsEarned: points
      };
    }
    setDays(map);
  };

  useEffect(() => {
    loadMonth();
  }, [user?.id, user?.dailySessionCount, currentMonth.getFullYear(), currentMonth.getMonth()]);

  const handleMonthChange = (delta: number) => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + delta,
        1
      )
    );
  };

  const handleDayPress = (day: DayData) => {
    setSelectedDay(day);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.primary }]}>
      <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
        <View style={styles.titleBar}>
        <Text style={styles.title}>{t('calendar')}</Text>
        </View>
      </View>

      <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CalendarView
        days={days}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        onDayPress={handleDayPress}
      />

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>{t('legendBothDone')}</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>{t('legendOneDone')}</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>{t('legendMissed')}</Text>
        </View>
      </View>
      </View>

      <Modal
        visible={!!selectedDay}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedDay(null)}
        >
          <View style={styles.modalContent}>
            {selectedDay && (
              <>
                {(() => {
                  const today = dateKey(new Date());
                  const isPastDay = selectedDay.date < today;
                  const isTodayOrFuture = selectedDay.date >= today;
                  return (
                    <>
                <Text style={styles.modalTitle}>
                  {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString(language === 'en' ? 'en-US' : 'tr-TR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.sectionTitle}> {t('tasksCompleted')}</Text>
                </View>
                  {selectedDay.morningCompleted && (
                    <Text style={styles.taskItem}>• {t('morningBrushing')}</Text>
                  )}
                  {selectedDay.eveningCompleted && (
                    <Text style={styles.taskItem}>• {t('eveningBrushing')}</Text>
                  )}
                  {!selectedDay.morningCompleted && !selectedDay.eveningCompleted && (
                    <Text style={styles.taskItemMuted}>{t('none')}</Text>
                  )}
                </View>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                  <Ionicons name="time" size={16} color={colors.accent} />
                  <Text style={styles.sectionTitle}> {t('tasksRemaining')}</Text>
                </View>
                  {isTodayOrFuture && !selectedDay.morningCompleted && (
                    <Text style={styles.taskItem}>• {t('morningBrushing')}</Text>
                  )}
                  {isTodayOrFuture && !selectedDay.eveningCompleted && (
                    <Text style={styles.taskItem}>• {t('eveningBrushing')}</Text>
                  )}
                  {(!isTodayOrFuture || (selectedDay.morningCompleted && selectedDay.eveningCompleted)) && (
                    <Text style={styles.taskItemMuted}>{t('none')}</Text>
                  )}
                </View>
                <View style={styles.section}>
                  <View style={styles.sectionTitleRow}>
                  <Ionicons name="close-circle" size={16} color={colors.error} />
                  <Text style={styles.sectionTitle}> {t('tasksMissed')}</Text>
                </View>
                  {isPastDay && !selectedDay.morningCompleted && (
                    <Text style={styles.taskItem}>• {t('morningBrushing')}</Text>
                  )}
                  {isPastDay && !selectedDay.eveningCompleted && (
                    <Text style={styles.taskItem}>• {t('eveningBrushing')}</Text>
                  )}
                  {(!isPastDay || (selectedDay.morningCompleted && selectedDay.eveningCompleted)) && (
                    <Text style={styles.taskItemMuted}>{t('none')}</Text>
                  )}
                </View>
                <View style={styles.pointsRow}>
                  <Ionicons name="star" size={18} color={colors.primary} />
                  <Text style={styles.pointsRowText}> {t('totalPoints')}: {selectedDay.pointsEarned ?? 0}</Text>
                </View>
                    </>
                  );
                })()}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  greenHeader: { backgroundColor: colors.primary },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    ...headerTitle
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: ui.spacingMd,
    flexWrap: 'wrap',
    marginHorizontal: ui.screenPadding
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontSize: 12, color: colors.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    padding: ui.spacingLg,
    width: '85%',
    maxWidth: 320
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    color: colors.text
  },
  section: {
    marginBottom: 16
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted
  },
  taskItem: {
    fontSize: 15,
    color: colors.text,
    marginLeft: 8,
    marginBottom: 4
  },
  taskItemMuted: {
    fontSize: 14,
    color: colors.muted,
    marginLeft: 8,
    fontStyle: 'italic'
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder
  },
  pointsRowText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary
  }
});
