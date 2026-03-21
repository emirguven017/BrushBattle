import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import type { MarketItem } from '../types';
import { useLanguage } from '../context/LanguageContext';

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
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.icon}>{item.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.desc}>{item.description}</Text>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.cost}>💎 {item.cost}</Text>
        <Text style={styles.owned}>{t('owned')}: {owned}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.buyBtn} onPress={onBuy}>
          <Text style={styles.buyText}>{t('buy')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.useBtn, owned <= 0 && styles.disabled]}
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  topRow: { flexDirection: 'row', gap: 10 },
  icon: { fontSize: 24 },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  desc: { fontSize: 13, color: colors.muted, marginTop: 2 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cost: { fontWeight: '800', color: colors.primary },
  owned: { color: colors.textSecondary, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  buyBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  useBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buyText: { color: colors.white, fontWeight: '700' },
  useText: { color: colors.white, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});

