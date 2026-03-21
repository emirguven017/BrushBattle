import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

interface RewardCardProps {
  rank: 1 | 2 | 3;
}

const rewardByRank = {
  1: { title: '1. Odul', br: 50, badge: '👑 Weekly Champion', buff: '+10% puan buff' },
  2: { title: '2. Odul', br: 30, badge: '🥈 Weekly Elite', buff: 'Yok' },
  3: { title: '3. Odul', br: 20, badge: '🥉 Top Performer', buff: 'Yok' },
} as const;

export const RewardCard: React.FC<RewardCardProps> = ({ rank }) => {
  const rw = rewardByRank[rank];
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{rw.title}</Text>
      <Text style={styles.row}>💎 +{rw.br} BR</Text>
      <Text style={styles.row}>{rw.badge}</Text>
      <Text style={styles.row}>⚡ {rw.buff}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 6 },
  row: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
});

