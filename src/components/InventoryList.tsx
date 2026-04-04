import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import type { MarketItemId, MarketItemId as ItemId } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface InventoryListProps {
  items: Partial<Record<MarketItemId, number>>;
}

export const InventoryList: React.FC<InventoryListProps> = ({ items }) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
  const itemIcon = (id: ItemId): keyof typeof Ionicons.glyphMap => {
    if (id === 'freeze') return 'snow';
    if (id === 'score_drop') return 'trending-down';
    if (id === 'shield') return 'shield-checkmark';
    if (id === 'streak_saver') return 'save';
    if (id === 'double_points') return 'flash';
    return 'rocket';
  };
  const rows = Object.entries(items).filter(([, qty]) => (qty ?? 0) > 0);
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="cube" size={16} color={colors.primary} />
          <Text style={styles.title}>{t('inventory')}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{rows.length}</Text>
        </View>
      </View>
      {rows.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="bag-handle-outline" size={16} color={colors.muted} />
          <Text style={styles.empty}>{t('noItemsYet')}</Text>
        </View>
      ) : (
        rows.map(([id, qty]) => (
          <View key={id} style={styles.rowCard}>
            <View style={styles.rowLeft}>
              <View style={styles.iconChip}>
                <Ionicons name={itemIcon(id as ItemId)} size={14} color={colors.primaryDark} />
              </View>
              <Text style={styles.rowName}>{itemLabel(id)}</Text>
            </View>
            <View style={styles.qtyPill}>
              <Text style={styles.qtyText}>x{qty}</Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.success },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  iconChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successLight
  },
  rowName: { fontSize: 13, fontWeight: '700', color: colors.text, flexShrink: 1 },
  qtyPill: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center'
  },
  qtyText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  emptyWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  empty: { color: colors.muted, fontSize: 13, fontWeight: '600' },
});
