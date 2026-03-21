import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import { NotificationService } from '../services/NotificationService';
import { LeaderboardService } from '../services/LeaderboardService';
import { InventoryService } from '../services/inventoryService';
import { WeeklyRewardService } from '../services/weeklyRewardService';
import { StreakCard, TaskCard, PrettyModal, BRBalanceCard, WeeklySummaryCard } from '../components';
import type { BrushSession, SessionType } from '../types';

const isTimeReached = (timeStr: string): boolean => {
  const [sh, sm] = timeStr.split(':').map(Number);
  const now = new Date();
  const ch = now.getHours();
  const cm = now.getMinutes();
  return ch > sh || (ch === sh && cm >= sm);
};

const minutesSinceScheduled = (timeStr: string): number => {
  const [sh, sm] = timeStr.split(':').map(Number);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes = sh * 60 + sm;
  return nowMinutes - scheduledMinutes;
};

const MOTIVATION_KEYS = ['keepStreak', 'oneLeft', 'friendAhead'];

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigation();
  const [sessions, setSessions] = useState<BrushSession[]>([]);
  const [rankings, setRankings] = useState<{ userId: string; username: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [notYetVisible, setNotYetVisible] = useState(false);
  const [notYetMessage, setNotYetMessage] = useState('');
  const [notYetTitle, setNotYetTitle] = useState('');
  const [brScore, setBrScore] = useState(0);
  const [weeklyRank, setWeeklyRank] = useState<number | undefined>(undefined);
  const [championName, setChampionName] = useState<string | undefined>(undefined);

  const load = async () => {
    if (!user) return;
    const [list, rankList, balance, weekly] = await Promise.all([
      BrushingService.getTodaySessions(user.id),
      user.groupId ? LeaderboardService.getGroupLeaderboard(user.groupId) : [],
      InventoryService.getBalance(user.id),
      user.groupId ? WeeklyRewardService.getWeeklyLeaderboard(user.groupId) : [],
    ]);
    setSessions(list);
    setRankings(rankList.slice(0, 3));
    setBrScore(balance.brScore);
    if (user.groupId) {
      setChampionName(weekly[0]?.username);
      const idx = weekly.findIndex((w) => w.userId === user.id);
      setWeeklyRank(idx >= 0 ? idx + 1 : undefined);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [user?.id, user?.groupId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const getSession = (type: SessionType) =>
    sessions.find(s => s.sessionType === type);
  const morning = getSession('morning');
  const evening = getSession('evening');
  const completedCount = [morning, evening].filter(
    s => s?.status === 'completed'
  ).length;
  const progressPercent = Math.round((completedCount / 2) * 100);
  const myRank =
    user?.groupId &&
    rankings.length > 0 &&
    rankings.findIndex(r => r.userId === user.id) + 1;

  const handleStartBrushing = async (sessionType: SessionType) => {
    if (!user) return;
    const scheduledTime = sessionType === 'morning'
      ? (user.morningTime ?? '08:00')
      : (user.eveningTime ?? '21:00');
    if (!isTimeReached(scheduledTime)) {
      const label = sessionType === 'morning' ? t('morning') : t('evening');
      setNotYetTitle(t('notYet'));
      setNotYetMessage(`${t('notTimeYet')} ${label}: ${scheduledTime}`);
      setNotYetVisible(true);
      return;
    }
    if (minutesSinceScheduled(scheduledTime) > 60) {
      setNotYetTitle(t('tooLate'));
      setNotYetMessage(t('tooLateToStart'));
      setNotYetVisible(true);
      return;
    }
    try {
      const session = await BrushingService.startSession(user, sessionType);
      await NotificationService.schedulePersistentReminders(user.id, sessionType);
      (nav as { navigate: (n: string, p?: object) => void }).navigate(
        'BrushingTimer',
        { session }
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('somethingWrong');
      Alert.alert(msg.includes('zaten tamamladın') || msg.includes('already completed') ? t('info') : t('error'), msg);
      load();
    }
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 18) return t('goodAfternoon');
    return t('goodEvening');
  })();
  const displayName = user?.username || 'Fırçacı';

  return (
    <View style={styles.wrapper}>
    <PrettyModal
      visible={notYetVisible}
      variant="warning"
      title={notYetTitle || t('notYet')}
      message={notYetMessage}
      primaryText={t('ok')}
      onPrimary={() => setNotYetVisible(false)}
      onClose={() => setNotYetVisible(false)}
    />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting},</Text>
        <Text style={styles.userName}>{displayName}! 👋</Text>
        <Text style={styles.tagline}>{t('todayQuestion')}</Text>
      </View>

      <StreakCard
        streak={user?.streak ?? 0}
        points={user?.points ?? 0}
        rank={myRank || undefined}
      />
      <BRBalanceCard brScore={brScore} />
      <WeeklySummaryCard myRank={weeklyRank} championName={championName} />
      <TouchableOpacity
        style={styles.marketBtn}
        onPress={() => (nav as { navigate: (n: string, p?: object) => void }).navigate('BRMarket')}
      >
        <Text style={styles.marketBtnText}>🛒 BR Market'e Git</Text>
      </TouchableOpacity>

      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>{t('dailyProgress')}</Text>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {completedCount}/2 tamamlandı ({progressPercent}%)
        </Text>
      </View>

      <View style={styles.motivationCard}>
        <Text style={styles.motivationIcon}>💡</Text>
        <Text style={styles.motivationText}>
          {t(MOTIVATION_KEYS[Math.floor(Math.random() * MOTIVATION_KEYS.length)])}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>{t('todayTasks')}</Text>

      <TaskCard
        title={t('morningTask')}
        status={morning?.status ?? 'pending'}
        onStart={() => handleStartBrushing('morning')}
      />
      <TaskCard
        title={t('eveningTask')}
        status={evening?.status ?? 'pending'}
        onStart={() => handleStartBrushing('evening')}
      />

      {rankings.length > 0 && (
        <View style={styles.leaderboardPreview}>
          <Text style={styles.previewTitle}>{t('top3')}</Text>
          {rankings.map((r, i) => (
            <Text key={r.userId} style={styles.previewRow}>
              {i + 1}. {r.userId === user?.id ? t('you') : r.username}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 50 },
  header: {
    marginBottom: 24,
    paddingBottom: 16
  },
  greeting: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 2
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5
  },
  tagline: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4
  },
  progressCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  progressLabel: { fontSize: 14, fontWeight: '600', color: colors.muted, marginBottom: 8 },
  progressBar: {
    height: 10,
    backgroundColor: colors.background,
    borderRadius: 5,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5
  },
  progressText: { fontSize: 12, color: colors.muted, marginTop: 6 },
  motivationCard: {
    backgroundColor: colors.successLight,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  motivationIcon: {
    fontSize: 24
  },
  motivationText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12
  },
  leaderboardPreview: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10
  },
  previewRow: { fontSize: 14, color: colors.muted, marginBottom: 4 }
  ,
  marketBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  marketBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  }
});
