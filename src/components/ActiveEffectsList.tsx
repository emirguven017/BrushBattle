import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
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
  const { t } = useLanguage();
  const effectLabel = (type: string) => {
    if (type === 'frozen') return t('effectFrozen');
    if (type === 'shield') return t('effectShield');
    if (type === 'streak_saver') return t('effectStreakSaver');
    if (type === 'double_points') return t('effectDoublePoints');
    if (type === 'rank_booster') return t('effectRankBooster');
    if (type === 'bonus_points') return t('effectBonusPoints');
    if (type === 'champion_crown') return t('effectChampionCrown');
    return type;
  };
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('activeEffects')}</Text>
      {effects.length === 0 ? (
        <Text style={styles.empty}>{t('noActiveEffects')}</Text>
      ) : (
        effects.map((e) => (
          <Text key={e.id} style={styles.row}>
            • {effectLabel(e.type)} {e.expiresAt ? `(${leftTime(e.expiresAt)})` : ''}
          </Text>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  row: { fontSize: 14, color: colors.text, marginBottom: 4 },
  empty: { color: colors.muted, fontSize: 13 },
});

