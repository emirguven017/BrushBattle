import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
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
}

export const WeeklySummaryCard: React.FC<WeeklySummaryCardProps> = ({
  myRank,
  championName,
  weeklyRankings = [],
  currentUserId
}) => {
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
    <View style={styles.card}>
      <Text style={styles.line}>
        {t('rankThisWeek')}: {myRank ? `#${myRank}` : '-'}
      </Text>
      <Text style={styles.championLine}>{t('currentChampion')}: {championName ?? '-'}</Text>
      {competitionText ? (
        <View style={styles.competitionBox}>
          <Text style={styles.competitionText}>{competitionText}</Text>
        </View>
      ) : null}
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
});

