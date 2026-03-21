import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

interface WeeklySummaryCardProps {
  myRank?: number;
  championName?: string;
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({ myRank, championName }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.line}>🏆 Rank {myRank ? `#${myRank}` : '-' } this week</Text>
      <Text style={styles.line}>👑 Current Champion: {championName ?? '-'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  line: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
});

