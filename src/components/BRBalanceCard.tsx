import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors } from '../utils/colors';
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
    <View style={styles.card}>
      <Text style={styles.label}>{t('brScoreLabel')}</Text>
      <View style={styles.valueRow}>
        <Ionicons name="diamond" size={24} color={colors.primary} />
        <Text style={styles.value}> {brScore}</Text>
      </View>
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: colors.muted, marginBottom: 4, fontWeight: '600' },
  valueRow: { flexDirection: 'row', alignItems: 'center' },
  value: { fontSize: 24, fontWeight: '800', color: colors.primary },
});
