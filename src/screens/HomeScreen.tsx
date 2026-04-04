import React, { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, ui } from '../utils/colors';
import { uiStyles } from '../utils/uiStyles';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useTabJump } from '../context/TabJumpContext';
import { BrushingService } from '../services/BrushingService';
import { NotificationService } from '../services/NotificationService';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { InventoryService } from '../services/inventoryService';
import { LeaderboardService } from '../services/LeaderboardService';
import { WeeklySummaryCard } from '../components';
import type { BrushSession, SessionType } from '../types';

const minutesSinceScheduled = (timeStr: string): number => {
  const [sh, sm] = timeStr.split(':').map(Number);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes = sh * 60 + sm;
  return nowMinutes - scheduledMinutes;
};

const MOTIVATION_KEYS = ['keepStreak', 'oneLeft', 'friendAhead'];

const IOS_GROUPED_BG = '#F2F2F7';
const IOS_SEPARATOR = 'rgba(60, 60, 67, 0.29)';

export const HomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigation();
  const tabJump = useTabJump();
  const [sessions, setSessions] = useState<BrushSession[]>([]);
  const [weeklyRankings, setWeeklyRankings] = useState<{ userId: string; username: string; points: number }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [brScore, setBrScore] = useState(0);
  const [weeklyRank, setWeeklyRank] = useState<number | undefined>(undefined);
  const [championName, setChampionName] = useState<string | undefined>(undefined);
  const [lateBrushModal, setLateBrushModal] = useState<SessionType | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);
  const plannedSessionTypes: SessionType[] = useMemo(() => {
    const count = Math.min(3, Math.max(1, Number(user?.dailySessionCount ?? 2)));
    if (count === 1) return ['morning'];
    if (count === 2) return ['morning', 'evening'];
    return ['morning', 'midday', 'evening'];
  }, [user?.dailySessionCount]);

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
      setChampionName(undefined);
      setWeeklyRank(undefined);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [user?.id, user?.groupId])
  );

  useLayoutEffect(() => {
    (nav as {
      setOptions: (opts: {
        headerRight: () => React.ReactNode;
        headerRightContainerStyle?: object;
      }) => void;
    }).setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerBrBtn}
          activeOpacity={0.85}
          onPress={() => tabJump?.jumpToTab('BRMarket')}
        >
          <View style={styles.headerBrRow}>
            <Ionicons name="diamond" size={13} color={colors.text} />
            <Text style={styles.headerBrText}>{brScore}</Text>
          </View>
        </TouchableOpacity>
      )
    });
  }, [nav, brScore, tabJump]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  /** Gün + kullanıcıya göre sabit; her render'da metin zıplamaz */
  const motivationMessage = useMemo(() => {
    const dayKey = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < dayKey.length; i += 1) seed += dayKey.charCodeAt(i);
    if (user?.id) for (let i = 0; i < user.id.length; i += 1) seed += user.id.charCodeAt(i);
    const idx = Math.abs(seed) % MOTIVATION_KEYS.length;
    return t(MOTIVATION_KEYS[idx]);
  }, [t, user?.id]);

  const getSession = (type: SessionType) => sessions.find(s => s.sessionType === type);
  const getSessionTime = (session: BrushSession | undefined, sessionType: SessionType): string =>
    session?.scheduledTime ?? (
      sessionType === 'morning'
        ? (user?.morningTime ?? '08:00')
        : sessionType === 'midday'
          ? (user?.middayTime ?? '14:00')
        : (user?.eveningTime ?? '21:00')
    );

  const getEffectiveStatus = (
    session: BrushSession | undefined,
    sessionType: SessionType
  ): 'completed' | 'pending' | 'due' | 'missed' => {
    if (session?.status === 'completed') return 'completed';
    const scheduledTime = session?.scheduledTime ?? (
      sessionType === 'morning'
        ? (user?.morningTime ?? '08:00')
        : sessionType === 'midday'
          ? (user?.middayTime ?? '14:00')
        : (user?.eveningTime ?? '21:00')
    );
    const mins = minutesSinceScheduled(scheduledTime);
    if (mins > 60) return 'missed';
    if (mins >= 0) return 'due'; // fırçalama saati geldi
    return 'pending';
  };

  const timeChipColors = (status: ReturnType<typeof getEffectiveStatus>) => {
    switch (status) {
      case 'completed':
        return {
          bg: colors.successLight,
          border: colors.success + '33',
          fg: colors.success
        };
      case 'missed':
        return {
          bg: colors.errorLight,
          border: colors.error + '33',
          fg: colors.error
        };
      case 'due':
        return {
          bg: colors.successLight,
          border: colors.primary + '40',
          fg: colors.primaryDark
        };
      default:
        return {
          bg: colors.accentLight,
          border: colors.accent + '33',
          fg: colors.accent
        };
    }
  };

  const completedCount = plannedSessionTypes.filter(
    (type) => getSession(type)?.status === 'completed'
  ).length;
  const progressPercent = Math.round((completedCount / plannedSessionTypes.length) * 100);

  const doStartBrushing = async (sessionType: SessionType) => {
    if (!user) return;
    try {
      const session = await BrushingService.startSession(user, sessionType);
      await NotificationService.schedulePersistentReminders(user.id, sessionType);
      (nav as { navigate: (n: string, p?: object) => void }).navigate('BrushingTimer', {
        session,
        timerEntry: 'home',
      });
    } catch (e) {
      const code = (e as { code?: string })?.code;
      if (code === 'TOO_EARLY_TO_START') {
        setFeedbackModal({
          title: t('notYet'),
          message: t('canStartOnlyOneHourBefore'),
        });
      } else {
        setFeedbackModal({
          title: t('error'),
          message: t('somethingWrong'),
        });
      }
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
  const getSessionTitle = (sessionType: SessionType) => {
    if (sessionType === 'morning') return t('morningTask');
    if (sessionType === 'midday') return t('middayTask');
    return t('eveningTask');
  };

  const isIOS = Platform.OS === 'ios';

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[colors.primary]}
      tintColor={colors.primary}
    />
  );

  const statusLabel = (
    status: ReturnType<typeof getEffectiveStatus>
  ): string =>
    status === 'completed'
      ? t('statusCompleted')
      : status === 'missed'
        ? t('statusMissed')
        : status === 'due'
          ? t('statusDue')
          : t('statusPending');

  return (
    <View style={[styles.wrapper, !isIOS && uiStyles.screen, isIOS && styles.wrapperIOS]}>
    <ScrollView
      style={[styles.container, isIOS && styles.containerIOS]}
      contentContainerStyle={[styles.content, isIOS && styles.contentIOS]}
      refreshControl={refreshControl}
    >
      {isIOS ? (
        <>
          <View style={styles.iosGreetingBlock}>
            <Text style={styles.iosGreetingCaps}>{greeting}</Text>
            <Text style={styles.iosUserName}>{displayName}</Text>
            <Text style={styles.iosTagline}>{t('todayQuestion')}</Text>
          </View>

          <View style={styles.iosInsetGroup}>
            <View style={styles.iosProgressHeaderRow}>
              <Text style={styles.iosProgressLabel}>{t('dailyProgress')}</Text>
              <Text style={styles.iosProgressFraction}>
                {completedCount}/{plannedSessionTypes.length} · {progressPercent}%
              </Text>
            </View>
            <View style={styles.iosProgressTrack}>
              <View style={[styles.iosProgressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>

          <Text style={styles.iosSectionHeader}>{t('todayTasks')}</Text>

          <View style={styles.iosInsetGroup}>
            {plannedSessionTypes.map((sessionType, index) => {
              const session = getSession(sessionType);
              const status = getEffectiveStatus(session, sessionType);
              const done = status === 'completed';
              return (
                <View key={sessionType}>
                  {index > 0 ? <View style={styles.iosSepInset} /> : null}
                  <View style={[styles.iosTaskCell, done && styles.iosTaskCellDone]}>
                    <View style={styles.iosTaskTopRow}>
                      <Text style={styles.iosTaskTitle}>{getSessionTitle(sessionType)}</Text>
                      <Text style={styles.iosTaskTime}>{getSessionTime(session, sessionType)}</Text>
                    </View>
                    <Text style={styles.iosTaskStatus}>{statusLabel(status)}</Text>
                    <TouchableOpacity
                      style={[styles.iosTaskBtn, done && styles.iosTaskBtnOutline]}
                      onPress={() => handleStartBrushing(sessionType)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.iosTaskBtnLabel, done && styles.iosTaskBtnLabelOutline]}>
                        {done ? t('repeatBrushing') : status === 'missed' ? t('brushAnyway') : t('startBrushing')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={styles.iosMotivation}>{motivationMessage}</Text>

          {weeklyRankings.length > 0 ? (
            <View style={styles.iosInsetGroup}>
              <TouchableOpacity
                style={styles.iosChevronRow}
                onPress={() => tabJump?.jumpToTab('Leaderboard')}
                activeOpacity={0.65}
              >
                <Text style={styles.iosChevronRowLabel}>{t('weeklyRanking')}</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.muted} />
              </TouchableOpacity>
              <View style={styles.iosSepFull} />
              <WeeklySummaryCard
                embedded
                myRank={weeklyRank}
                championName={championName}
                weeklyRankings={weeklyRankings}
                currentUserId={user?.id}
              />
            </View>
          ) : null}
        </>
      ) : (
        <>
          <View style={[uiStyles.card, styles.header]}>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.tagline}>{t('todayQuestion')}</Text>
          </View>

          <View style={[uiStyles.card, styles.progressCard]}>
            <Text style={styles.progressLabel}>{t('dailyProgress')}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {completedCount}/{plannedSessionTypes.length} {t('progressCompleted')} ({progressPercent}%)
            </Text>
          </View>

          <Text style={[uiStyles.sectionTitle, styles.sectionTitle]}>{t('todayTasks')}</Text>

          {plannedSessionTypes.map((sessionType) => {
            const session = getSession(sessionType);
            const status = getEffectiveStatus(session, sessionType);
            const chip = timeChipColors(status);
            return (
              <View key={sessionType} style={[styles.taskCard, status === 'completed' && styles.taskCardCompleted]}>
                <View style={styles.taskHeaderRow}>
                  <Text style={styles.taskTitle}>{getSessionTitle(sessionType)}</Text>
                  <View style={[styles.taskTimeChip, { backgroundColor: chip.bg, borderColor: chip.border }]}>
                    <Ionicons name="time-outline" size={12} color={chip.fg} />
                    <Text style={[styles.taskTimeText, { color: chip.fg }]}>{getSessionTime(session, sessionType)}</Text>
                  </View>
                </View>
                <Text style={styles.taskStatusInline}>{statusLabel(status)}</Text>
                <TouchableOpacity
                  style={[styles.taskBtn, status === 'completed' && styles.taskBtnSecondary]}
                  onPress={() => handleStartBrushing(sessionType)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.taskBtnText, status === 'completed' && styles.taskBtnTextSecondary]}>
                    {status === 'completed' ? t('repeatBrushing') : status === 'missed' ? t('brushAnyway') : t('startBrushing')}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}

          <Text style={styles.motivationText}>{motivationMessage}</Text>

          {weeklyRankings.length > 0 && (
            <TouchableOpacity
              style={[uiStyles.card, styles.leaderboardPreview]}
              onPress={() => tabJump?.jumpToTab('Leaderboard')}
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
                  <Text style={styles.previewPoints}>
                    {r.points} {t('leaderboardPointsUnit')}
                  </Text>
                </View>
              ))}
            </TouchableOpacity>
          )}

          {weeklyRankings.length > 0 ? (
            <View style={styles.weeklySection}>
              <WeeklySummaryCard
                myRank={weeklyRank}
                championName={championName}
                weeklyRankings={weeklyRankings}
                currentUserId={user?.id}
              />
            </View>
          ) : null}
        </>
      )}
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

    <AppFeedbackModal
      visible={feedbackModal !== null}
      title={feedbackModal?.title ?? ''}
      message={feedbackModal?.message ?? ''}
      buttonText={t('ok') || 'OK'}
      onClose={() => setFeedbackModal(null)}
    />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  wrapperIOS: { backgroundColor: IOS_GROUPED_BG },
  container: { flex: 1, backgroundColor: colors.background },
  containerIOS: { backgroundColor: IOS_GROUPED_BG },
  content: { padding: ui.screenPadding, paddingBottom: 40, flexGrow: 1 },
  contentIOS: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 48,
    flexGrow: 1,
  },
  iosGreetingBlock: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  iosGreetingCaps: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  iosUserName: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  iosTagline: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 6,
    lineHeight: 20,
  },
  iosInsetGroup: {
    backgroundColor: colors.white,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      default: {},
    }),
  },
  iosProgressHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  iosProgressLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  iosProgressFraction: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.muted,
  },
  iosProgressTrack: {
    height: 4,
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: 'rgba(60, 60, 67, 0.12)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  iosProgressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  iosSectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: -0.08,
    marginBottom: 8,
    marginLeft: 16,
  },
  iosSepInset: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: 16,
  },
  iosSepFull: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
  },
  iosTaskCell: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  iosTaskCellDone: {
    backgroundColor: 'rgba(46, 204, 113, 0.06)',
  },
  iosTaskTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  iosTaskTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  iosTaskTime: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  iosTaskStatus: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 12,
  },
  iosTaskBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iosTaskBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.primary,
  },
  iosTaskBtnLabel: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  iosTaskBtnLabelOutline: {
    color: colors.primary,
  },
  iosMotivation: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  iosChevronRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  iosChevronRowLabel: {
    fontSize: 17,
    color: colors.text,
  },
  header: {
    marginBottom: 10,
    paddingVertical: 12,
  },
  headerBrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerBrBtn: {
    marginRight: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  headerBrText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800'
  },
  greeting: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4
  },
  tagline: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 6
  },
  progressCard: {
    marginBottom: 8,
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
  motivationText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 12
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8
  },
  taskCard: {
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    padding: ui.cardPadding,
    marginBottom: 10,
    flexShrink: 0,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder
  },
  taskCardCompleted: {
    borderColor: colors.success,
    backgroundColor: colors.successLight
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  taskStatusInline: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: 8,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4
  },
  taskTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  taskTimeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  taskBtn: {
    backgroundColor: colors.primary,
    borderRadius: ui.radiusMd,
    minHeight: ui.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    paddingHorizontal: 14,
  },
  taskBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary
  },
  taskBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700'
  },
  taskBtnTextSecondary: {
    color: colors.primary
  },
  leaderboardPreview: {
    borderRadius: ui.radiusLg,
    padding: ui.cardPadding,
    marginTop: 8,
    borderWidth: ui.borderWidth,
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
  weeklySection: {
    marginTop: 8,
    marginBottom: 8,
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
  },
});
