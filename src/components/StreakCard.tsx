import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface StreakCardProps {
  streak: number;
  points: number;
  rank?: number;
  size?: 'small' | 'large';
}

/** Displays streak, points, and optional weekly rank in a compact card */
export const StreakCard: React.FC<StreakCardProps> = ({
  streak,
  points,
  rank,
  size = 'large'
}) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  const iconSz = size === 'small' ? 14 : 16;
  return (
    <View style={[styles.card, size === 'small' && styles.cardSmall]}>
      <View style={styles.row}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, size === 'small' && styles.textSmall]}>
            {streak}
          </Text>
          <View style={styles.labelRow}>
            <Ionicons name="flame" size={iconSz} color={colors.muted} />
            <Text style={[styles.statLabel, size === 'small' && styles.textSmall]}>
              {t('streakDaysLabel')}
            </Text>
          </View>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, size === 'small' && styles.textSmall]}>
            {points}
          </Text>
          <View style={styles.labelRow}>
            <Ionicons name="star" size={iconSz} color={colors.muted} />
            <Text style={[styles.statLabel, size === 'small' && styles.textSmall]}>
              {t('pointsLabel')}
            </Text>
          </View>
        </View>
      </View>
      {rank != null && (
        <View style={styles.rankBadge}>
          <View style={styles.labelRow}>
            <Ionicons name="trophy" size={iconSz} color={colors.textSecondary} />
            <Text style={[styles.rank, size === 'small' && styles.textSmall]}>
              {t('rankThisWeek')} #{rank}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  cardSmall: { padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted
  },
  rankBadge: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    alignItems: 'center'
  },
  rank: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  textSmall: { fontSize: 14 }
});
