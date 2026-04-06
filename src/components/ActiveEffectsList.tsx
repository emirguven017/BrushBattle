import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors, ui } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import type { ActiveEffect } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ActiveEffectsListProps {
  effects: ActiveEffect[];
}

const leftTime = (expiresAt?: number) => {
  if (!expiresAt) return '';
  const ms = Math.max(0, expiresAt - Date.now());
  const m = Math.floor(ms / 60000);
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm}m`;
};

export const ActiveEffectsList: React.FC<ActiveEffectsListProps> = ({ effects }) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  const effectLabel = (type: string) => {
    if (type === 'frozen') return t('marketItemFreezeTitle');
    if (type === 'shield') return t('marketItemShieldTitle');
    if (type === 'streak_saver') return t('marketItemStreakSaverTitle');
    if (type === 'double_points') return t('marketItemDoublePointsTitle');
    if (type === 'rank_booster') return t('marketItemRankBoosterTitle');
    if (type === 'bonus_points') return t('effectBonusPoints');
    if (type === 'champion_crown') return t('effectChampionCrown');
    return type;
  };
  const effectIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type === 'frozen') return 'snow';
    if (type === 'shield') return 'shield-checkmark';
    if (type === 'streak_saver') return 'save';
    if (type === 'double_points') return 'flash';
    if (type === 'rank_booster') return 'rocket';
    if (type === 'bonus_points') return 'sparkles';
    return 'trophy';
  };
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="sparkles" size={16} color={colors.primary} />
          <Text style={styles.title}>{t('activeEffects')}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{effects.length}</Text>
        </View>
      </View>
      {effects.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="moon-outline" size={16} color={colors.muted} />
          <Text style={styles.empty}>{t('noActiveEffects')}</Text>
        </View>
      ) : (
        effects.map((e) => (
          <View key={e.id} style={styles.rowCard}>
            <View style={styles.rowLeft}>
              <View style={styles.iconChip}>
                <Ionicons name={effectIcon(e.type)} size={14} color={colors.primaryDark} />
              </View>
              <Text style={styles.rowName}>{effectLabel(e.type)}</Text>
            </View>
            {e.expiresAt ? (
              <View style={styles.timePill}>
                <Ionicons name="time-outline" size={12} color={colors.warning} />
                <Text style={styles.timeText}>{leftTime(e.expiresAt)}</Text>
              </View>
            ) : (
              <View style={styles.activePill}>
                <Text style={styles.activeText}>Aktif</Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    padding: 16,
    marginBottom: 14,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.warning },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 6 },
  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warningLight
  },
  rowName: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 1 },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  timeText: { fontSize: 12, fontWeight: '800', color: colors.warning },
  activePill: {
    backgroundColor: colors.successLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  activeText: { fontSize: 12, fontWeight: '800', color: colors.success },
  emptyWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  empty: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
