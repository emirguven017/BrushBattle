import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

interface LeaderboardItemProps {
  rank: number;
  username: string;
  points: number;
  streak: number;
  isCurrentUser?: boolean;
  completedToday?: boolean;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Single leaderboard row with rank styling for top 3 */
export const LeaderboardItem: React.FC<LeaderboardItemProps> = ({
  rank,
  username,
  points,
  streak,
  isCurrentUser,
  completedToday
}) => {
  const isTop3 = rank <= 3;

  return (
    <View style={[styles.card, isCurrentUser && styles.cardHighlight, isTop3 && styles.cardTop3]}>
      <Text style={styles.rank}>{MEDALS[rank - 1] || `${rank}.`}</Text>
      <View style={styles.info}>
        <Text style={[styles.name, isCurrentUser && styles.nameHighlight]}>
          {username} {isCurrentUser && '(Sen)'}
        </Text>
        <Text style={styles.meta}>
          ⭐ {points} pts · 🔥 {streak} streak
          {completedToday && ' · 🪥✅'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  cardHighlight: { borderWidth: 2, borderColor: colors.primary },
  cardTop3: { backgroundColor: '#F0FDF4' },
  rank: { fontSize: 24, width: 44, textAlign: 'center' },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  nameHighlight: { color: colors.primary },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 }
});
