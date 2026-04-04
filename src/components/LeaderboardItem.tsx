import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface LeaderboardItemProps {
  rank: number;
  username: string;
  points: number;
  streak: number;
  isCurrentUser?: boolean;
  completedToday?: boolean;
}

/** Single leaderboard row with rank number */
export const LeaderboardItem: React.FC<LeaderboardItemProps> = ({
  rank,
  username,
  points,
  streak,
  isCurrentUser,
  completedToday
}) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();

  return (
    <View style={[styles.card, isCurrentUser && styles.cardHighlight]}>
      <View style={styles.rankBox}>
        <Text style={styles.rank}>{rank}.</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.name, isCurrentUser && styles.nameHighlight]}>
          {username} {isCurrentUser && `(${t('you')})`}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={12} color={colors.muted} />
          <Text style={styles.meta}> {points} pts · </Text>
          <Ionicons name="flame" size={12} color={colors.muted} />
          <Text style={styles.meta}> {streak} streak</Text>
          {completedToday && (
            <>
              <Text style={styles.meta}> · </Text>
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
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
  rankBox: { width: 44, alignItems: 'center', justifyContent: 'center' },
  rank: { fontSize: 24, fontWeight: '700', color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  nameHighlight: { color: colors.primary },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2 }
});
