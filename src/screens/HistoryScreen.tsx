import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet
} from 'react-native';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { BrushingService } from '../services/BrushingService';
import {
  CalendarView,
  type DayData,
  type DayStatus
} from '../components';
import { dateKey } from '../utils/date';

export const HistoryScreen: React.FC = () => {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [days, setDays] = useState<Record<string, DayData>>({});
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

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
      const morningDone = morning?.status === 'completed';
      const eveningDone = evening?.status === 'completed';
      let status: DayStatus = 'empty';
      if (morningDone && eveningDone) status = 'full';
      else if (morningDone || eveningDone) status = 'partial';
      else if (daySessions.length > 0) status = 'missed';

      const points =
        (morning?.pointsEarned ?? 0) +
        (evening?.pointsEarned ?? 0) +
        (morning?.dayBonusApplied || evening?.dayBonusApplied ? 10 : 0);

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
  }, [user?.id, currentMonth.getFullYear(), currentMonth.getMonth()]);

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
    <View style={styles.container}>
      <View style={styles.titleBar}>
        <Text style={styles.title}> Takvim</Text>
      </View>

      <CalendarView
        days={days}
        currentMonth={currentMonth}
        onMonthChange={handleMonthChange}
        onDayPress={handleDayPress}
      />

      <View style={styles.legend}>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
          <Text style={styles.legendText}>İkisi de tamam</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
          <Text style={styles.legendText}>Biri tamam</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
          <Text style={styles.legendText}>Kaçırıldı</Text>
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
                  {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('tr-TR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </Text>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>✅ Yapılan görevler</Text>
                  {selectedDay.morningCompleted && (
                    <Text style={styles.taskItem}>• Sabah fırçalama</Text>
                  )}
                  {selectedDay.eveningCompleted && (
                    <Text style={styles.taskItem}>• Akşam fırçalama</Text>
                  )}
                  {!selectedDay.morningCompleted && !selectedDay.eveningCompleted && (
                    <Text style={styles.taskItemMuted}>Yok</Text>
                  )}
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>⏳ Kalan görevler</Text>
                  {isTodayOrFuture && !selectedDay.morningCompleted && (
                    <Text style={styles.taskItem}>• Sabah fırçalama</Text>
                  )}
                  {isTodayOrFuture && !selectedDay.eveningCompleted && (
                    <Text style={styles.taskItem}>• Akşam fırçalama</Text>
                  )}
                  {(!isTodayOrFuture || (selectedDay.morningCompleted && selectedDay.eveningCompleted)) && (
                    <Text style={styles.taskItemMuted}>Yok</Text>
                  )}
                </View>
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>❌ Kaçırılan görevler</Text>
                  {isPastDay && !selectedDay.morningCompleted && (
                    <Text style={styles.taskItem}>• Sabah fırçalama</Text>
                  )}
                  {isPastDay && !selectedDay.eveningCompleted && (
                    <Text style={styles.taskItem}>• Akşam fırçalama</Text>
                  )}
                  {(!isPastDay || (selectedDay.morningCompleted && selectedDay.eveningCompleted)) && (
                    <Text style={styles.taskItemMuted}>Yok</Text>
                  )}
                </View>
                <Text style={styles.pointsRow}>
                  ⭐ Toplam puan: {selectedDay.pointsEarned ?? 0}
                </Text>
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
  container: { flex: 1, backgroundColor: colors.background },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
    marginHorizontal: 16
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginRight: 16, marginBottom: 8 },
  legendDot: { width: 14, height: 14, borderRadius: 7, marginRight: 6 },
  legendText: { fontSize: 12, color: colors.muted },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 320
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    color: colors.text
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 8
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
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder
  }
});
