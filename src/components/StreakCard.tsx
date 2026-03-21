import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

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
}) => (
  <View style={[styles.card, size === 'small' && styles.cardSmall]}>
    <View style={styles.row}>
      <View style={styles.statBox}>
        <Text style={[styles.statValue, size === 'small' && styles.textSmall]}>
          {streak}
        </Text>
        <Text style={[styles.statLabel, size === 'small' && styles.textSmall]}>
          🔥 gün streak
        </Text>
      </View>
      <View style={styles.statBox}>
        <Text style={[styles.statValue, size === 'small' && styles.textSmall]}>
          {points}
        </Text>
        <Text style={[styles.statLabel, size === 'small' && styles.textSmall]}>
          ⭐ puan
        </Text>
      </View>
    </View>
    {rank != null && (
      <View style={styles.rankBadge}>
        <Text style={[styles.rank, size === 'small' && styles.textSmall]}>
          🏆 Bu hafta #{rank}
        </Text>
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
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
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginTop: 4
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
