import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

type TaskStatus = 'completed' | 'pending' | 'missed';

interface TaskCardProps {
  title: string;
  status: TaskStatus;
  onStart?: () => void;
}

/** Task card for morning/evening brushing with large CTA button */
export const TaskCard: React.FC<TaskCardProps> = ({ title, status, onStart }) => {
  const isCompleted = status === 'completed';
  const isMissed = status === 'missed';

  const statusConfig = {
    completed: { icon: '✅', label: 'Tamamlandı', bg: colors.successLight },
    pending: { icon: '⏳', label: 'Bekliyor', bg: colors.accentLight },
    missed: { icon: '❌', label: 'Kaçırıldı', bg: colors.errorLight }
  };
  const config = statusConfig[status];

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
        <Text style={styles.statusChipText}>{config.icon} {config.label}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!isCompleted && onStart && (
        <TouchableOpacity style={styles.btn} onPress={onStart} activeOpacity={0.85}>
          <Text style={styles.btnText}>🪥 Fırçalamaya Başla</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  cardCompleted: {
    borderColor: colors.success,
    backgroundColor: colors.successLight
  },
  statusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8
  },
  btnText: { color: colors.white, fontSize: 17, fontWeight: '700' }
});
