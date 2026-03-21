import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import type { MarketItemId } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface InventoryListProps {
  items: Partial<Record<MarketItemId, number>>;
}

export const InventoryList: React.FC<InventoryListProps> = ({ items }) => {
  const { t } = useLanguage();
  const itemLabel = (id: string) => {
    if (id === 'freeze') return t('marketItemFreezeTitle');
    if (id === 'score_drop') return t('marketItemScoreDropTitle');
    if (id === 'shield') return t('marketItemShieldTitle');
    if (id === 'streak_saver') return t('marketItemStreakSaverTitle');
    if (id === 'double_points') return t('marketItemDoublePointsTitle');
    if (id === 'rank_booster') return t('marketItemRankBoosterTitle');
    return id;
  };
  const rows = Object.entries(items).filter(([, qty]) => (qty ?? 0) > 0);
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('inventory')}</Text>
      {rows.length === 0 ? (
        <Text style={styles.empty}>{t('noItemsYet')}</Text>
      ) : (
        rows.map(([id, qty]) => (
          <Text key={id} style={styles.row}>
            • {itemLabel(id)} x{qty}
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

