import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { LeaderboardService } from '../services/LeaderboardService';
import { LeaderboardItem, RewardCard } from '../components';
import type { LeaderboardRanking } from '../types';

export const LeaderboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user } = useAuth();
  const nav = useNavigation();
  const [rankings, setRankings] = useState<LeaderboardRanking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.groupId) return;
    const list = await LeaderboardService.getGroupWeeklyLeaderboard(user.groupId);
    setRankings(list);
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [user?.groupId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  if (!user?.groupId) {
    return (
      <View style={[styles.wrapper, { backgroundColor: colors.primary }]}>
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{t('scoreTitle')}</Text>
          </View>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('joinGroupFirst')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
        <View style={styles.titleBar}>
          <Text style={styles.title}>{t('weeklyScoreTitle')}</Text>
        </View>
        <Text style={styles.subtitle}>{t('weeklyRankingSubtitle')}</Text>
      </View>
      <View style={styles.content}>
      <View style={styles.rewardWrap}>
        <View style={styles.rewardCard}>
          <RewardCard rank={1} />
        </View>
        <View style={styles.rewardCard}>
          <RewardCard rank={2} />
        </View>
        <View style={styles.rewardCard}>
          <RewardCard rank={3} />
        </View>
      </View>
      <Text style={styles.rankingTitle}>{t('ranking')}</Text>
      <FlatList
        data={rankings}
        keyExtractor={r => r.userId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[styles.list, rankings.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          <View style={styles.emptyRanking}>
            <Text style={styles.emptyRankingText}>{t('noRankingYet')}</Text>
            <Text style={styles.emptyRankingHint}>{t('noRankingHint')}</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View style={styles.rowWrap}>
            <LeaderboardItem
              rank={index + 1}
              username={item.username}
              points={item.points}
              streak={item.streak}
              isCurrentUser={item.userId === user.id}
              completedToday={undefined}
            />
            {item.userId !== user.id && (
              <TouchableOpacity
                style={styles.targetBtn}
                onPress={() =>
                  (nav as { navigate: (n: string, p?: object) => void }).navigate('BRMarket', {
                    targetUserId: item.userId,
                  })
                }
              >
                <Text style={styles.targetBtnText}>{t('selectTargetMarket')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  greenHeader: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 20
  },
  content: { flex: 1 },
  rewardWrap: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 6,
  },
  rewardCard: { flex: 1, minWidth: 0 },
  rankingTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  listEmpty: { flexGrow: 1, minHeight: 120 },
  emptyRanking: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyRankingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
  },
  emptyRankingHint: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: { fontSize: 16, color: colors.muted }
  ,
  rowWrap: {
    position: 'relative',
    marginBottom: 6
  },
  targetBtn: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -14,
    backgroundColor: colors.accent,
    minWidth: 88,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4
  },
  targetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
    lineHeight: 12
  }
});
