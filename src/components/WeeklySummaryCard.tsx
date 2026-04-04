import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface WeeklyRanking {
  userId: string;
  username: string;
  points: number;
}

interface WeeklySummaryCardProps {
  myRank?: number;
  championName?: string;
  weeklyRankings?: WeeklyRanking[];
  currentUserId?: string;
  /** iOS Home: iç içe beyaz kart yerine gruplanmış grup içinde düz yerleşim */
  embedded?: boolean;
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  myRank,
  championName,
  weeklyRankings = [],
  currentUserId,
  embedded = false,
}) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  const myEntry = currentUserId ? weeklyRankings.find((r) => r.userId === currentUserId) : undefined;
  const myPoints = myEntry?.points ?? 0;

  const replaceVars = (s: string, vars: Record<string, string | number>) => {
    let r = s;
    for (const [k, v] of Object.entries(vars)) r = r.replace(`{${k}}`, String(v));
    return r;
  };

  let competitionText = '';
  if (weeklyRankings.length > 0 && myRank != null) {
    const rankAbove = weeklyRankings[myRank - 2];
    const rankBelow = weeklyRankings[myRank];
    if (myRank === 1) {
      const pointsLead = rankBelow ? myPoints - rankBelow.points : 0;
      if (pointsLead > 0) {
        competitionText = replaceVars(t('competitionYouLead'), { points: pointsLead });
      } else {
        competitionText = t('competitionChampion');
      }
    } else if (rankAbove) {
      const gapToFirst = rankAbove.points - myPoints;
      competitionText = replaceVars(t('competitionCatchUp'), { name: rankAbove.username, points: gapToFirst });
    } else if (rankBelow) {
      competitionText = replaceVars(t('competitionAheadOf'), { name: rankBelow.username, points: myPoints - rankBelow.points });
    }
  }

  return (
    <View style={[styles.card, embedded && styles.cardEmbedded]}>
      <View style={styles.rankRow}>
        <View style={styles.rankLabelWrap}>
          <Ionicons name="trophy-outline" size={15} color={colors.primary} />
          <Text style={styles.rankLabel}>{t('rankThisWeek')}</Text>
        </View>
        <View style={[styles.rankPill, embedded && styles.rankPillEmbedded]}>
          <Text style={[styles.rankPillText, embedded && styles.rankPillTextEmbedded]}>
            {myRank ? `#${myRank}` : '-'}
          </Text>
        </View>
      </View>
      <Text style={styles.championLine}>{t('currentChampion')}: {championName ?? '-'}</Text>
      {competitionText ? (
        <View style={[styles.competitionBox, embedded && styles.competitionBoxEmbedded]}>
          <Text style={[styles.competitionText, embedded && styles.competitionTextEmbedded]}>
            {competitionText}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  cardEmbedded: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 0,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  rankLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  rankLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  rankPill: {
    minWidth: 52,
    borderRadius: 999,
    backgroundColor: colors.primary + '1A',
    borderWidth: 1,
    borderColor: colors.primary + '55',
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center'
  },
  rankPillText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13
  },
  rankPillEmbedded: {
    backgroundColor: 'rgba(60, 60, 67, 0.08)',
    borderColor: 'rgba(60, 60, 67, 0.12)',
  },
  rankPillTextEmbedded: {
    color: colors.text,
    fontWeight: '600',
  },
  championLine: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 8,
  },
  competitionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  competitionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.accent,
  },
  competitionBoxEmbedded: {
    backgroundColor: 'rgba(60, 60, 67, 0.06)',
  },
  competitionTextEmbedded: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
