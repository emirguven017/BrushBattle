import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors, ui } from '../utils/colors';
import { createUiStyles } from '../utils/uiStyles';
import { useColors } from '../context/ThemeContext';
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
  const colors = useColors();
  const uiStyles = useMemo(() => createUiStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          style={uiStyles.buttonPrimary}
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

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    padding: ui.spacingLg,
    marginBottom: ui.spacingMd,
    borderWidth: ui.borderWidth,
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
  btnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 }
});
