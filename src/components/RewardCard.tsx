import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors, ui } from '../utils/colors';
import { createUiStyles } from '../utils/uiStyles';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const BADGE_ICONS = ['trophy', 'medal', 'medal'] as const;
const BADGE_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;

interface RewardCardProps {
  rank: 1 | 2 | 3;
}

export const RewardCard: React.FC<RewardCardProps> = ({ rank }) => {
  const colors = useColors();
  const uiStyles = useMemo(() => createUiStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  const rewardByRank = {
    1: { title: t('reward1'), br: 50, badge: t('weeklyChampionBadge'), buff: t('pointBuff') },
    2: { title: t('reward2'), br: 30, badge: t('weeklyElite'), buff: t('noneShort') },
    3: { title: t('reward3'), br: 20, badge: t('topPerformer'), buff: t('noneShort') },
  } as const;
  const rw = rewardByRank[rank];
  return (
    <View style={[uiStyles.card, styles.card]}>
      <Text style={styles.title}>{rw.title}</Text>
      <View style={styles.row}>
        <Ionicons name="diamond" size={14} color={colors.primary} />
        <Text style={styles.rowText}> +{rw.br} BR</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name={BADGE_ICONS[rank - 1]} size={14} color={BADGE_COLORS[rank - 1]} />
        <Text style={styles.rowText}> {rw.badge}</Text>
      </View>
      <View style={styles.row}>
        <Ionicons name="flash" size={14} color={colors.primary} />
        <Text style={styles.rowText}> {rw.buff}</Text>
      </View>
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    marginBottom: 8,
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  rowText: { fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
});
