import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { LeaderboardService } from '../services/LeaderboardService';
import { CrownBadge, LeaderboardItem, RewardCard } from '../components';
import type { LeaderboardRanking } from '../types';

export const LeaderboardScreen: React.FC = () => {
  const { user } = useAuth();
  const nav = useNavigation();
  const [rankings, setRankings] = useState<LeaderboardRanking[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!user?.groupId) return;
    const list = await LeaderboardService.getGroupWeeklyLeaderboard(user.groupId);
    setRankings(list);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [user?.groupId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  if (!user?.groupId) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.titleBar}>
          <Text style={styles.title}>🏆 Skor</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Önce bir gruba katıl</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>🏆 Haftalik Skor</Text>
      </View>
      <View style={styles.rewardWrap}>
        <RewardCard rank={1} />
        <RewardCard rank={2} />
        <RewardCard rank={3} />
      </View>
      <FlatList
        data={rankings}
        keyExtractor={r => r.userId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <View>
            <LeaderboardItem
              rank={index + 1}
              username={`${index === 0 ? '👑 ' : ''}${item.username}`}
              points={item.points}
              streak={item.streak}
              isCurrentUser={item.userId === user.id}
              completedToday={undefined}
            />
            {index === 0 && <CrownBadge />}
            {item.userId !== user.id && (
              <TouchableOpacity
                style={styles.targetBtn}
                onPress={() =>
                  (nav as { navigate: (n: string, p?: object) => void }).navigate('BRMarket', {
                    targetUserId: item.userId,
                  })
                }
              >
                <Text style={styles.targetBtnText}>🎯 Hedef Sec (Market)</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
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
  rewardWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: { fontSize: 16, color: colors.muted }
  ,
  targetBtn: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
    marginTop: -4,
  },
  targetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  }
});
