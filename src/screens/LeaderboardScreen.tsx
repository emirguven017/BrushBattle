import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { type Colors, headerTitle, ui } from '../utils/colors';
import { createUiStyles } from '../utils/uiStyles';
import { isIosUi } from '../utils/iosUi';
import { useColors } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { LeaderboardService } from '../services/LeaderboardService';
import { LeaderboardItem, RewardCard } from '../components';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';
import type { LeaderboardRanking } from '../types';

export const LeaderboardScreen: React.FC = () => {
  const colors = useColors();
  const uiStyles = useMemo(() => createUiStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <BrandedScreenBackground>
      <View style={styles.wrapper}>
        {!isIosUi ? (
          <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
            <View style={styles.titleBar}>
              <Text style={styles.title}>{t('weeklyScoreTitle')}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('joinGroupFirst')}</Text>
        </View>
      </View>
      </BrandedScreenBackground>
    );
  }

  return (
    <BrandedScreenBackground>
    <View style={styles.wrapper}>
      {!isIosUi ? (
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{t('weeklyScoreTitle')}</Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.content, uiStyles.content, isIosUi && styles.contentIos]}>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.white]}
            tintColor={colors.white}
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
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: 'transparent' },
  greenHeader: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: 'transparent' },
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
  contentIos: {
    paddingTop: 4,
  },
  rewardWrap: {
    flexDirection: 'row',
    paddingHorizontal: ui.screenPadding,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 8,
  },
  rewardCard: { flex: 1, minWidth: 0 },
  rankingTitle: {
    paddingHorizontal: ui.screenPadding,
    marginTop: 10,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
  },
  list: { paddingHorizontal: ui.screenPadding, paddingBottom: 40, paddingTop: 4 },
  listEmpty: { flexGrow: 1, minHeight: 120 },
  emptyRanking: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyRankingText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 6,
  },
  emptyRankingHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  rowWrap: {
    position: 'relative',
    marginBottom: 6,
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
    elevation: 0,
  },
  targetBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accent,
    textAlign: 'center',
    lineHeight: 12,
  },
});
