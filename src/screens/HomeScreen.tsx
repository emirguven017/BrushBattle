import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import { NotificationService } from '../services/NotificationService';
import { InventoryService } from '../services/inventoryService';
import { LeaderboardService } from '../services/LeaderboardService';
import { StreakCard, BRBalanceCard, WeeklySummaryCard } from '../components';
import type { BrushSession, SessionType } from '../types';

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
  const [weeklyRankings, setWeeklyRankings] = useState<{ userId: string; username: string; points: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [brScore, setBrScore] = useState(0);
  const [weeklyRank, setWeeklyRank] = useState<number | undefined>(undefined);
  const [championName, setChampionName] = useState<string | undefined>(undefined);
  const [lateBrushModal, setLateBrushModal] = useState<SessionType | null>(null);

  const load = async () => {
    if (!user) return;
    const [list, balance, weekly] = await Promise.all([
      BrushingService.getTodaySessions(user.id),
      InventoryService.getBalance(user.id),
      user.groupId ? LeaderboardService.getGroupWeeklyLeaderboard(user.groupId) : [],
    ]);
    setSessions(list);
    setBrScore(balance.brScore);
    if (user.groupId && weekly.length > 0) {
      setWeeklyRankings(weekly.map((w) => ({ userId: w.userId, username: w.username, points: w.points })));
      setChampionName(weekly[0]?.username);
      const idx = weekly.findIndex((w) => w.userId === user.id);
      setWeeklyRank(idx >= 0 ? idx + 1 : undefined);
    } else {
      setWeeklyRankings([]);
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

  const getEffectiveStatus = (
    session: BrushSession | undefined,
    sessionType: SessionType
  ): 'completed' | 'pending' | 'due' | 'missed' => {
    if (session?.status === 'completed') return 'completed';
    const scheduledTime =
      sessionType === 'morning'
        ? (user?.morningTime ?? '08:00')
        : (user?.eveningTime ?? '21:00');
    const mins = minutesSinceScheduled(scheduledTime);
    if (mins > 60) return 'missed';
    if (mins >= 0) return 'due'; // fırçalama saati geldi
    return 'pending';
  };

  const completedCount = [morning, evening].filter(
    s => s?.status === 'completed'
  ).length;
  const progressPercent = Math.round((completedCount / 2) * 100);

  const doStartBrushing = async (sessionType: SessionType) => {
    if (!user) return;
    try {
      const session = await BrushingService.startSession(user, sessionType);
      await NotificationService.schedulePersistentReminders(user.id, sessionType);
      (nav as { navigate: (n: string, p?: object) => void }).navigate(
        'BrushingTimer',
        { session }
      );
    } catch (e) {
      load();
    }
  };

  const handleStartBrushing = (sessionType: SessionType) => {
    if (getEffectiveStatus(getSession(sessionType), sessionType) === 'missed') {
      setLateBrushModal(sessionType);
    } else {
      doStartBrushing(sessionType);
    }
  };

  const handleLateBrushConfirm = () => {
    if (lateBrushModal) {
      doStartBrushing(lateBrushModal);
      setLateBrushModal(null);
    }
  };

  const handleLateBrushCancel = () => {
    setLateBrushModal(null);
  };

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t('goodMorning');
    if (h < 18) return t('goodAfternoon');
    return t('goodEvening');
  })();
  const displayName = user?.username || t('defaultUserName');

  return (
    <View style={styles.wrapper}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{greeting},</Text>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{displayName}!</Text>
          <Ionicons name="hand-left" size={20} color={colors.text} style={{ marginLeft: 4 }} />
        </View>
        <Text style={styles.tagline}>{t('todayQuestion')}</Text>
      </View>

      <StreakCard
        streak={user?.streak ?? 0}
        points={
          weeklyRankings.find((r) => r.userId === user?.id)?.points ??
          user?.points ??
          0
        }
        rank={weeklyRank}
      />

      <Text style={styles.sectionTitle}>{t('todayTasks')}</Text>

      <View style={[styles.taskCard, getEffectiveStatus(morning, 'morning') === 'completed' && styles.taskCardCompleted]}>
        <View style={[
          styles.taskStatusChip,
          { backgroundColor: getEffectiveStatus(morning, 'morning') === 'completed' || getEffectiveStatus(morning, 'morning') === 'due' ? colors.successLight : getEffectiveStatus(morning, 'morning') === 'missed' ? colors.errorLight : colors.accentLight }
        ]}>
          <View style={styles.taskStatusRow}>
            <Ionicons
              name={getEffectiveStatus(morning, 'morning') === 'completed' || getEffectiveStatus(morning, 'morning') === 'due' ? 'checkmark-circle' : getEffectiveStatus(morning, 'morning') === 'missed' ? 'close-circle' : 'time'}
              size={16}
              color={getEffectiveStatus(morning, 'morning') === 'completed' ? colors.success : getEffectiveStatus(morning, 'morning') === 'missed' ? colors.error : getEffectiveStatus(morning, 'morning') === 'due' ? colors.success : colors.accent}
            />
            <Text style={styles.taskStatusText}>
              {getEffectiveStatus(morning, 'morning') === 'completed' ? t('statusCompleted') : getEffectiveStatus(morning, 'morning') === 'missed' ? t('statusMissed') : getEffectiveStatus(morning, 'morning') === 'due' ? t('statusDue') : t('statusPending')}
            </Text>
          </View>
        </View>
        <Text style={styles.taskTitle}>{t('morningTask')}</Text>
        <TouchableOpacity
          style={[styles.taskBtn, getEffectiveStatus(morning, 'morning') === 'completed' && styles.taskBtnSecondary]}
          onPress={() => handleStartBrushing('morning')}
          activeOpacity={0.85}
        >
          <Text style={[styles.taskBtnText, getEffectiveStatus(morning, 'morning') === 'completed' && styles.taskBtnTextSecondary]}>
            {getEffectiveStatus(morning, 'morning') === 'completed' ? t('repeatBrushing') : getEffectiveStatus(morning, 'morning') === 'missed' ? t('brushAnyway') : t('startBrushing')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.taskCard, getEffectiveStatus(evening, 'evening') === 'completed' && styles.taskCardCompleted]}>
        <View style={[
          styles.taskStatusChip,
          { backgroundColor: getEffectiveStatus(evening, 'evening') === 'completed' || getEffectiveStatus(evening, 'evening') === 'due' ? colors.successLight : getEffectiveStatus(evening, 'evening') === 'missed' ? colors.errorLight : colors.accentLight }
        ]}>
          <View style={styles.taskStatusRow}>
            <Ionicons
              name={getEffectiveStatus(evening, 'evening') === 'completed' || getEffectiveStatus(evening, 'evening') === 'due' ? 'checkmark-circle' : getEffectiveStatus(evening, 'evening') === 'missed' ? 'close-circle' : 'time'}
              size={16}
              color={getEffectiveStatus(evening, 'evening') === 'completed' ? colors.success : getEffectiveStatus(evening, 'evening') === 'missed' ? colors.error : getEffectiveStatus(evening, 'evening') === 'due' ? colors.success : colors.accent}
            />
            <Text style={styles.taskStatusText}>
              {getEffectiveStatus(evening, 'evening') === 'completed' ? t('statusCompleted') : getEffectiveStatus(evening, 'evening') === 'missed' ? t('statusMissed') : getEffectiveStatus(evening, 'evening') === 'due' ? t('statusDue') : t('statusPending')}
            </Text>
          </View>
        </View>
        <Text style={styles.taskTitle}>{t('eveningTask')}</Text>
        <TouchableOpacity
          style={[styles.taskBtn, getEffectiveStatus(evening, 'evening') === 'completed' && styles.taskBtnSecondary]}
          onPress={() => handleStartBrushing('evening')}
          activeOpacity={0.85}
        >
          <Text style={[styles.taskBtnText, getEffectiveStatus(evening, 'evening') === 'completed' && styles.taskBtnTextSecondary]}>
            {getEffectiveStatus(evening, 'evening') === 'completed' ? t('repeatBrushing') : getEffectiveStatus(evening, 'evening') === 'missed' ? t('brushAnyway') : t('startBrushing')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.brSection}>
        <BRBalanceCard brScore={brScore} />
        <TouchableOpacity
          style={styles.marketBtn}
          onPress={() => (nav as { navigate: (n: string, p?: object) => void }).navigate('BRMarket')}
        >
          <View style={styles.taskBtnContent}>
            <Ionicons name="cart" size={18} color={colors.white} />
            <Text style={styles.marketBtnText}> {t('goToMarket')}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.progressCard}>
        <Text style={styles.progressLabel}>{t('dailyProgress')}</Text>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progressPercent}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {completedCount}/2 {t('progressCompleted')} ({progressPercent}%)
        </Text>
      </View>

      <View style={styles.motivationCard}>
        <Ionicons name="bulb" size={24} color={colors.primary} />
        <Text style={styles.motivationText}>
          {t(MOTIVATION_KEYS[Math.floor(Math.random() * MOTIVATION_KEYS.length)])}
        </Text>
      </View>

      {weeklyRankings.length > 0 && (
        <TouchableOpacity
          style={styles.leaderboardPreview}
          onPress={() => (nav as { navigate: (n: string) => void }).navigate('Leaderboard')}
          activeOpacity={0.8}
        >
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{t('weeklyRanking')}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.primary} />
          </View>
          {weeklyRankings.slice(0, 5).map((r, i) => (
            <View key={r.userId} style={[styles.previewRowWrap, r.userId === user?.id && styles.previewRowHighlight]}>
              <View style={styles.previewRankBox}>
                <Text style={styles.previewRank}>{i + 1}.</Text>
              </View>
              <Text style={[styles.previewRow, r.userId === user?.id && styles.previewRowYou]} numberOfLines={1}>
                {r.userId === user?.id ? t('you') : r.username}
              </Text>
              <Text style={styles.previewPoints}>{r.points} pts</Text>
            </View>
          ))}
        </TouchableOpacity>
      )}

      <View style={styles.weeklySection}>
        <WeeklySummaryCard
          myRank={weeklyRank}
          championName={championName}
          weeklyRankings={weeklyRankings}
          currentUserId={user?.id}
        />
      </View>
    </ScrollView>

    <Modal visible={lateBrushModal !== null} transparent animationType="fade" onRequestClose={handleLateBrushCancel}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('lateBrushingAlertTitle')}</Text>
          <Text style={styles.modalMessage}>{t('lateBrushingAlertMessage')}</Text>
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalBtnCancel}
              onPress={handleLateBrushCancel}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnCancelText}>{t('dontBrush')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalBtnConfirm}
              onPress={handleLateBrushConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.modalBtnConfirmText}>{t('brushAnyway')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 50, flexGrow: 1 },
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
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center'
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
  taskStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  taskBtnContent: {
    flexDirection: 'row',
    alignItems: 'center'
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
    marginTop: 20,
    marginBottom: 12
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  taskCardCompleted: {
    borderColor: colors.success,
    backgroundColor: colors.successLight
  },
  taskStatusChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12
  },
  taskStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  taskBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 56
  },
  taskBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary
  },
  taskBtnText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700'
  },
  taskBtnTextSecondary: {
    color: colors.primary
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
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text
  },
  previewRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    marginBottom: 2
  },
  previewRowHighlight: {
    backgroundColor: colors.primary + '15',
    marginHorizontal: -4,
    paddingHorizontal: 8
  },
  previewRankBox: { width: 28, alignItems: 'center' },
  previewRank: { fontSize: 14, fontWeight: '700', color: colors.muted },
  previewRow: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600', marginLeft: 8 },
  previewRowYou: { color: colors.primary },
  previewPoints: { fontSize: 14, fontWeight: '700', color: colors.primary },
  brSection: {
    marginBottom: 16,
  },
  weeklySection: {
    marginTop: 24,
    marginBottom: 8,
  },
  marketBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  marketBtnText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center'
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center'
  },
  modalBtnCancelText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700'
  },
  modalBtnConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center'
  },
  modalBtnConfirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700'
  }
});
