import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, ui } from '../utils/colors';
import { uiStyles } from '../utils/uiStyles';
import type { MarketItem, MarketItemId } from '../types';
import { useLanguage } from '../context/LanguageContext';

const ITEM_ICONS: Record<MarketItemId, keyof typeof Ionicons.glyphMap> = {
  freeze: 'snow',
  score_drop: 'trending-down',
  shield: 'shield-checkmark',
  streak_saver: 'bookmark',
  double_points: 'flash',
  rank_booster: 'rocket',
  bonus_points: 'star',
  champion_crown: 'trophy',
};

interface MarketItemCardProps {
  item: MarketItem;
  owned: number;
  onBuy: () => void;
  onUse: () => void;
}

export const MarketItemCard: React.FC<MarketItemCardProps> = ({
  item,
  owned,
  onBuy,
  onUse,
}) => {
  const { t } = useLanguage();
  const iconName = ITEM_ICONS[item.id] ?? 'gift';
  return (
    <View style={[uiStyles.card, styles.card]}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={28} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.desc}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.costRow}>
          <Ionicons name="diamond" size={16} color={colors.primary} />
          <Text style={styles.cost}> {item.cost}</Text>
        </View>
        <Text style={styles.owned}>{t('owned')}: {owned}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[uiStyles.buttonSecondary, styles.buyBtn]} onPress={onBuy}>
          <Text style={styles.buyText}>{t('buy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[uiStyles.buttonPrimary, styles.useBtn, owned <= 0 && styles.disabled]}
          onPress={onUse}
          disabled={owned <= 0}
        >
          <Text style={styles.useText}>{t('use')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  topRow: { flexDirection: 'row', gap: 10 },
  iconWrap: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  costRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  desc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cost: { fontWeight: '800', color: colors.primary },
  owned: { color: colors.textSecondary, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  buyBtn: {
    flex: 1,
    minHeight: 42,
    borderColor: colors.accent,
  },
  useBtn: {
    flex: 1,
    minHeight: 42,
  },
  buyText: { color: colors.accent, fontWeight: '700' },
  useText: { color: colors.white, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});

