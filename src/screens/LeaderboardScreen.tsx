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
import { colors, headerTitle, ui } from '../utils/colors';
import { uiStyles } from '../utils/uiStyles';
import { IOS_GROUPED_BG, iosSectionLabelText, isIosUi } from '../utils/iosUi';
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
      <View style={[styles.wrapper, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}>
        {!isIosUi ? (
          <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
            <View style={styles.titleBar}>
              <Text style={styles.title}>{t('weeklyScoreTitle')}</Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.empty, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}>
          <Text style={styles.emptyText}>{t('joinGroupFirst')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}>
      {!isIosUi ? (
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{t('weeklyScoreTitle')}</Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.content, uiStyles.content, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}>
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
      <Text
        style={[
          uiStyles.sectionTitle,
          styles.rankingTitle,
          isIosUi && iosSectionLabelText,
        ]}
      >
        {t('ranking')}
      </Text>
      <FlatList
        data={rankings}
        keyExtractor={r => r.userId}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
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
            <TouchableOpacity
              style={styles.targetBtn}
              onPress={() =>
                (nav as { navigate: (n: string, p?: object) => void }).navigate('UseFeature', {
                  targetUserId: item.userId,
                })
              }
            >
              <Text style={styles.targetBtnText}>{t('selectTargetMarket')}</Text>
            </TouchableOpacity>
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
    ...headerTitle
  },
  content: { flex: 1 },
  rewardWrap: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 6,
  },
  rewardCard: { flex: 1, minWidth: 0 },
  rankingTitle: {
    paddingHorizontal: ui.screenPadding,
    marginTop: 6,
    marginBottom: 6,
  },
  list: { paddingHorizontal: ui.screenPadding, paddingBottom: 32 },
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
    backgroundColor: colors.white,
    minWidth: 82,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: ui.radiusSm,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  },
  targetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    textAlign: 'center',
    lineHeight: 12
  }
});
