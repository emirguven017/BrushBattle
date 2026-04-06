import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
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
  completedToday,
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
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  cardHighlight: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.successLight,
  },
  rankBox: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  rank: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  nameHighlight: { color: colors.primaryDark },
  meta: { fontSize: 12, color: colors.muted, lineHeight: 16 },
});
