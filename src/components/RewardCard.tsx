import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const BADGE_ICONS = ['trophy', 'medal', 'medal'] as const;
const BADGE_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'] as const;
const ACCENT_TOP = ['#FFD700', '#B8B8B8', '#CD7F32'] as const;

interface RewardCardProps {
  rank: 1 | 2 | 3;
}

export const RewardCard: React.FC<RewardCardProps> = ({ rank }) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  const rewardByRank = {
    1: { title: t('reward1'), br: 50, badge: t('weeklyChampionBadge'), buff: t('pointBuff') },
    2: { title: t('reward2'), br: 30, badge: t('weeklyElite'), buff: t('noneShort') },
    3: { title: t('reward3'), br: 20, badge: t('topPerformer'), buff: t('noneShort') },
  } as const;
  const rw = rewardByRank[rank];
  return (
    <View style={styles.wrap}>
      <View style={[styles.accentBar, { backgroundColor: ACCENT_TOP[rank - 1] }]} />
      <View style={styles.card}>
        <Text style={styles.title}>{rw.title}</Text>
        <View style={styles.row}>
          <Ionicons name="diamond" size={14} color={colors.primary} />
          <Text style={styles.rowText}>
            {' '}
            +{rw.br} BR
          </Text>
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
    </View>
  );
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrap: {
      borderRadius: 18,
      overflow: 'hidden',
      marginBottom: 4,
    },
    accentBar: {
      height: 3,
      width: '100%',
    },
    card: {
      backgroundColor: colors.card,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderTopWidth: 0,
      borderColor: 'rgba(0,0,0,0.06)',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.11,
          shadowRadius: 14,
        },
        android: { elevation: 5 },
        default: {},
      }),
    },
    title: {
      fontSize: 12,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 8,
      letterSpacing: -0.2,
    },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    rowText: { fontSize: 11, color: colors.textSecondary, marginLeft: 4, flex: 1, lineHeight: 15 },
  });
