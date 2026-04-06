import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors, ui } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface BRBalanceCardProps {
  brScore: number;
}

export const BRBalanceCard: React.FC<BRBalanceCardProps> = ({ brScore }) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  return (
    <View style={styles.shell}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <Text style={styles.label}>{t('brScoreLabel')}</Text>
        <View style={styles.valueRow}>
          <View style={styles.diamondWrap}>
            <Ionicons name="diamond" size={22} color={colors.primaryDark} />
          </View>
          <Text style={styles.value}>{brScore}</Text>
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    shell: {
      borderRadius: ui.radiusLg,
      marginBottom: 14,
      overflow: 'hidden',
      backgroundColor: colors.card,
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
    accent: {
      height: 3,
      width: '100%',
      backgroundColor: colors.primary,
      opacity: 0.95,
    },
    inner: {
      padding: 16,
    },
    label: { fontSize: 12, color: colors.muted, marginBottom: 8, fontWeight: '700', letterSpacing: 0.2 },
    valueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    diamondWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.successLight,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.primary + '28',
    },
    value: { fontSize: 28, fontWeight: '800', color: colors.primaryDark, letterSpacing: -0.5 },
  });
