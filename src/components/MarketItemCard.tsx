import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors, ui } from '../utils/colors';
import { createUiStyles } from '../utils/uiStyles';
import { useColors } from '../context/ThemeContext';
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
  embedded?: boolean;
  isFirst?: boolean;
}

export const MarketItemCard: React.FC<MarketItemCardProps> = ({
  item,
  owned,
  onBuy,
  onUse,
  embedded,
  isFirst,
}) => {
  const colors = useColors();
  const uiStyles = useMemo(() => createUiStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  const iconName = ITEM_ICONS[item.id] ?? 'gift';

  const body = (
    <>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={26} color={colors.primaryDark} />
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
        <Text style={styles.owned}>
          {t('owned')}: {owned}
        </Text>
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
    </>
  );

  if (embedded) {
    return (
      <View
        style={[
          styles.embeddedCardBody,
          !isFirst && styles.embeddedCardBodyBorder,
        ]}
      >
        {body}
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.premiumCard]}>
      <View style={styles.accent} />
      <View style={styles.cardBody}>{body}</View>
    </View>
  );
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    card: { marginBottom: 14, overflow: 'hidden' },
    premiumCard: {
      borderRadius: ui.radiusLg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(0,0,0,0.06)',
      backgroundColor: colors.card,
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
    accent: {
      height: 3,
      width: '100%',
      backgroundColor: colors.primary,
      opacity: 0.95,
    },
    cardBody: {
      padding: ui.cardPadding,
    },
    embeddedCardBody: {
      paddingHorizontal: ui.cardPadding,
      paddingTop: 14,
      paddingBottom: 14,
    },
    embeddedCardBodyBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
      paddingTop: 16,
    },
    topRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.successLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.primary + '28',
    },
    costRow: { flexDirection: 'row', alignItems: 'center' },
    title: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
    desc: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, alignItems: 'center' },
    cost: { fontWeight: '800', color: colors.primary },
    owned: { color: colors.textSecondary, fontSize: 12 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    buyBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 999,
      borderColor: colors.accent,
    },
    useBtn: {
      flex: 1,
      minHeight: 46,
      borderRadius: 999,
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryDark,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.25,
          shadowRadius: 6,
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    buyText: { color: colors.accent, fontWeight: '700' },
    useText: { color: colors.white, fontWeight: '700' },
    disabled: { opacity: 0.45 },
  });
