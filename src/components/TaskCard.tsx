import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';

type TaskStatus = 'completed' | 'pending' | 'missed';

interface TaskCardProps {
  title: string;
  status: TaskStatus;
  onStart?: () => void;
  /** Geçti durumunda da fırçalama butonunu her zaman göster */
  alwaysShowBrushButton?: boolean;
}

/** Task card for morning/evening brushing with large CTA button */
export const TaskCard: React.FC<TaskCardProps> = ({ title, status, onStart, alwaysShowBrushButton = true }) => {
  const { t } = useLanguage();
  const isCompleted = status === 'completed';
  const isMissed = status === 'missed';

  const statusConfig = {
    completed: { icon: 'checkmark-circle' as const, label: t('statusCompleted'), bg: colors.successLight, color: colors.success },
    pending: { icon: 'time' as const, label: t('statusPending'), bg: colors.accentLight, color: colors.accent },
    missed: { icon: 'close-circle' as const, label: t('statusMissed'), bg: colors.errorLight, color: colors.error }
  };
  const config = statusConfig[status];

  return (
    <View style={[styles.card, isCompleted && styles.cardCompleted]}>
      <View style={[styles.statusChip, { backgroundColor: config.bg }]}>
        <View style={styles.statusChipRow}>
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={styles.statusChipText}> {config.label}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {!isCompleted && (
        <TouchableOpacity
          style={styles.btn}
          onPress={onStart ?? (() => {})}
          activeOpacity={0.85}
          disabled={!onStart}
        >
          <Text style={[styles.btnText, !onStart && styles.btnDisabled]}>
            {isMissed ? t('brushAnyway') : t('startBrushing')}
          </Text>
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
  statusChipRow: { flexDirection: 'row', alignItems: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
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
  btnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 }
});
