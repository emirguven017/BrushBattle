import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import { NotificationService } from '../services/NotificationService';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';
import { useColors } from '../context/ThemeContext';
import { type Colors, ui } from '../utils/colors';
import { createUiStyles } from '../utils/uiStyles';
import { createIosStyles, isIosUi } from '../utils/iosUi';
import { dateKey } from '../utils/date';
import type { BrushSession, SessionType } from '../types';

const minutesSinceScheduled = (timeStr: string): number => {
  const [sh, sm] = timeStr.split(':').map(Number);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes = sh * 60 + sm;
  return nowMinutes - scheduledMinutes;
};

export const BrushingMenuScreen: React.FC = () => {
  const colors = useColors();
  const uiStyles = useMemo(() => createUiStyles(colors), [colors]);
  const ios = useMemo(() => createIosStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { user } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState<BrushSession[]>([]);
  const [weekProgress, setWeekProgress] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);
  const [toothbrushCountdown, setToothbrushCountdown] = useState<{
    enabled: boolean;
    intervalDays: 30 | 45 | 60;
    daysLeft: number | null;
  } | null>(null);

  const plannedTypes = useMemo(
    () => (user ? BrushingService.getPlannedSessionTypesForUser(user) : []),
    [user]
  );
  const sessionPoints = useMemo(
    () => (user ? BrushingService.getSessionPointsForUser(user) : 0),
    [user]
  );

  const getSessionTime = (sessionType: SessionType, fallback?: string): string => {
    if (fallback) return fallback;
    if (sessionType === 'morning') return user?.morningTime ?? '08:00';
    if (sessionType === 'midday') return user?.middayTime ?? '14:00';
    return user?.eveningTime ?? '21:00';
  };

  const getSessionTitle = (sessionType: SessionType): string => {
    if (sessionType === 'morning') return t('morningTask');
    if (sessionType === 'midday') return t('middayTask');
    return t('eveningTask');
  };

  const getEffectiveStatus = (
    session: BrushSession | undefined,
    sessionType: SessionType
  ): 'completed' | 'pending' | 'due' | 'missed' => {
    if (session?.status === 'completed') return 'completed';
    const mins = minutesSinceScheduled(getSessionTime(sessionType, session?.scheduledTime));
    if (mins > 60) return 'missed';
    if (mins >= 0) return 'due';
    return 'pending';
  };

  const load = useCallback(async () => {
    if (!user) return;
    const todaySessions = await BrushingService.getTodaySessions(user.id);
    setSessions(todaySessions);

    const now = new Date();
    const monthSessions = await BrushingService.getSessionsForMonth(
      user.id,
      now.getFullYear(),
      now.getMonth() + 1
    );
    const progress: number[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      const daySessions = monthSessions.filter((s) => s.date === key);
      const completed = daySessions.filter((s) => s.status === 'completed').length;
      progress.push(Math.min(100, Math.round((completed / Math.max(1, plannedTypes.length)) * 100)));
    }
    setWeekProgress(progress);
    const countdown = await NotificationService.getToothbrushReplacementCountdown(user.id);
    setToothbrushCountdown(countdown);
  }, [plannedTypes.length, user]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load().catch(() => {});
    setRefreshing(false);
  };

  const startSessionDirect = async (sessionType: SessionType) => {
    if (!user) return;
    try {
      const session = await BrushingService.startSession(user, sessionType);
      await NotificationService.schedulePersistentReminders(user.id, sessionType);
      (nav as { navigate: (name: string, params?: object) => void }).navigate('BrushingTimer', {
        session,
        timerEntry: 'brush',
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
      load().catch(() => {});
    }
  };

  const handleStart = (sessionType: SessionType, status: 'completed' | 'pending' | 'due' | 'missed') => {
    if (status === 'missed' || status === 'pending') return;
    startSessionDirect(sessionType).catch(() => {});
  };


  const handleMarkToothbrushReplaced = async () => {
    if (!user) return;
    try {
      await NotificationService.markToothbrushReplaced(user.id);
      await load();
    } catch {
      setFeedbackModal({ title: t('error'), message: t('somethingWrong') });
    }
  };

  const weekdayLabels = t('weekdaysShort').split(',').slice(0, 7);

  return (
    <BrandedScreenBackground>
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.content, isIosUi && { paddingHorizontal: 16 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.white]}
            tintColor={colors.white}
          />
        }
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            (nav as { navigate: (name: string) => void }).navigate('BrushingAnalytics')
          }
          accessibilityRole="button"
          accessibilityLabel={`${t('brushingGraphTitle')}. ${t('brushingGraphTapHint')}`}
        >
          <View style={[uiStyles.card, styles.card, isIosUi && ios.iosGroupedCard, styles.premiumCard, styles.graphCard]}>
            <View style={styles.graphAccent} />
            <View style={styles.graphHeaderRow}>
              <View style={styles.graphHeaderText}>
                <Text style={[uiStyles.sectionTitle, styles.cardTitle]}>{t('brushingGraphTitle')}</Text>
                <Text style={styles.cardSubtitle}>{t('brushingGraphSubtitle')}</Text>
              </View>
              <View style={styles.chevronWrap}>
                <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
              </View>
            </View>
            <Text style={styles.tapHint}>{t('brushingGraphTapHint')}</Text>
            <View style={styles.chartWrap}>
              {weekProgress.map((v, i) => (
                <View key={`${weekdayLabels[i] ?? i}`} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: v === 0 ? '0%' : `${Math.max(10, v)}%` }]} />
                  </View>
                  <Text style={styles.barLabel}>{weekdayLabels[i] ?? ''}</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>

        <View style={[uiStyles.card, styles.card, isIosUi && ios.iosGroupedCard, styles.premiumCard]}>
          <View style={styles.rowBetween}>
            <Text style={[uiStyles.sectionTitle, styles.cardTitle]}>{t('sessionListTitle')}</Text>
            <View style={styles.pointHintPill}>
              <Text style={styles.pointHint}>+{sessionPoints} {t('pointsLabel')}</Text>
            </View>
          </View>
          {plannedTypes.map((sessionType) => {
            const session = sessions.find((s) => s.sessionType === sessionType);
            const status = getEffectiveStatus(session, sessionType);
            return (
              <View
                key={sessionType}
                style={[
                  styles.sessionRow,
                  status === 'missed' && styles.sessionRowMissed,
                  status === 'completed' && styles.sessionRowCompleted,
                ]}
              >
                <View style={styles.sessionHead}>
                  <Text style={styles.sessionTitle}>{getSessionTitle(sessionType)}</Text>
                  <Text style={styles.sessionTime}>{getSessionTime(sessionType, session?.scheduledTime)}</Text>
                </View>
                {status === 'missed' ? (
                  <View style={styles.missedBanner}>
                    <View style={styles.missedBannerIcon}>
                      <Ionicons name="time" size={16} color={colors.error} />
                    </View>
                    <View style={styles.missedBannerTextWrap}>
                      <Text style={styles.missedBannerTitle}>{t('statusMissed')}</Text>
                      <Text style={styles.missedBannerSub}>{t('sessionMissedHint')}</Text>
                    </View>
                  </View>
                ) : status === 'completed' ? (
                  <View style={styles.statusPillWide}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={styles.statusPillWideText}>{t('statusCompleted')}</Text>
                  </View>
                ) : (
                  <View style={styles.rowBetween}>
                    <Text style={styles.statusText}>
                      {status === 'due' ? t('statusDue') : t('statusPending')}
                    </Text>
                    <TouchableOpacity
                      style={[
                        uiStyles.buttonPrimary,
                        styles.startBtn,
                        status === 'pending' && styles.startBtnPending,
                      ]}
                      onPress={() => handleStart(sessionType, status)}
                      disabled={status === 'pending'}
                      activeOpacity={status === 'pending' ? 1 : 0.85}
                    >
                      <Ionicons
                        name={status === 'pending' ? 'time-outline' : 'play'}
                        size={16}
                        color={status === 'pending' ? colors.textSecondary : colors.white}
                      />
                      <Text
                        style={[
                          styles.startBtnText,
                          status === 'pending' && styles.startBtnTextPending,
                        ]}
                      >
                        {status === 'pending' ? t('waitingForScheduledTime') : t('startBrushing')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <View style={[uiStyles.card, styles.card, isIosUi && ios.iosGroupedCard, styles.premiumCard, styles.countdownCard]}>
          <View style={styles.countdownHeader}>
            <View style={styles.countdownIconWrap}>
              <Ionicons name="refresh-circle" size={22} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.countdownTitle}>{t('toothbrushCountdownTitle')}</Text>
              <Text style={styles.countdownSubtitle}>
                {toothbrushCountdown?.enabled
                  ? `${t('toothbrushNextChangeIn')} ${toothbrushCountdown.daysLeft ?? toothbrushCountdown.intervalDays} ${t('daysShort')}`
                  : t('toothbrushReminderOff')}
              </Text>
            </View>
            {toothbrushCountdown?.enabled ? (
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownBadgeText}>
                  {toothbrushCountdown.daysLeft ?? toothbrushCountdown.intervalDays}
                </Text>
              </View>
            ) : null}
          </View>
          {toothbrushCountdown?.enabled ? (
            <View style={styles.countdownProgressBg}>
              <View
                style={[
                  styles.countdownProgressFill,
                  {
                    width: `${Math.max(
                      8,
                      Math.min(
                        100,
                        Math.round(
                          ((toothbrushCountdown.intervalDays - (toothbrushCountdown.daysLeft ?? toothbrushCountdown.intervalDays))
                            / Math.max(1, toothbrushCountdown.intervalDays))
                          * 100
                        )
                      )
                    )}%`,
                  },
                ]}
              />
            </View>
          ) : null}
          {toothbrushCountdown?.enabled ? (
            <>
              <Text style={styles.countdownHint}>{t('toothbrushMarkReplacedHint')}</Text>
              <TouchableOpacity
                style={styles.countdownResetBtn}
                onPress={handleMarkToothbrushReplaced}
                activeOpacity={0.88}
              >
                <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                <Text style={styles.countdownResetBtnText}>{t('toothbrushMarkReplaced')}</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>

      <AppFeedbackModal
        visible={feedbackModal !== null}
        title={feedbackModal?.title ?? ''}
        message={feedbackModal?.message ?? ''}
        buttonText={t('ok') || 'OK'}
        onClose={() => setFeedbackModal(null)}
      />
    </View>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { padding: ui.screenPadding, paddingBottom: ui.spacingXl },
  card: {
    marginBottom: 14,
  },
  premiumCard: {
    borderRadius: ui.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  graphCard: {
    overflow: 'hidden',
  },
  graphAccent: {
    height: 3,
    marginHorizontal: -ui.cardPadding,
    marginTop: -ui.cardPadding,
    marginBottom: 12,
    backgroundColor: colors.primary,
    opacity: 0.95,
  },
  cardTitle: { marginBottom: 0 },
  cardSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
    letterSpacing: -0.1,
  },
  graphHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  graphHeaderText: { flex: 1, minWidth: 0 },
  chevronWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary + '28',
  },
  tapHint: {
    marginTop: 8,
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countdownIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary + '30',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
      default: {},
    }),
  },
  countdownCard: {
    marginBottom: 4,
  },
  countdownTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2,
  },
  countdownSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 16,
  },
  countdownBadge: {
    minWidth: 38,
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary + '45',
  },
  countdownBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  countdownProgressBg: {
    height: 9,
    borderRadius: 999,
    backgroundColor: colors.background,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  countdownProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  countdownHint: {
    marginTop: 12,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  countdownResetBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  countdownResetBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.2,
  },
  chartWrap: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 2,
  },
  barCol: { alignItems: 'center', width: 36 },
  barTrack: {
    width: 20,
    height: 76,
    borderRadius: 10,
    backgroundColor: colors.cardBorder,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  barLabel: {
    marginTop: 8,
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointHintPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.primary + '1A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary + '38',
  },
  pointHint: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  sessionRow: {
    marginTop: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: colors.background,
  },
  sessionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  sessionTime: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  statusText: { fontSize: 12, color: colors.textSecondary, fontWeight: '700' },
  /** Tamamlandı: satır zaten komple yeşil; içerik şeridi (kaçırılmış satırdaki banner gibi) */
  statusPillWide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'stretch',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.success + '18',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.success + '35',
  },
  statusPillWideText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  startBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  startBtnPending: {
    backgroundColor: colors.cardBorder,
    opacity: 0.92,
  },
  startBtnTextPending: { color: colors.textSecondary, fontSize: 15, fontWeight: '700' },
  sessionRowMissed: {
    borderColor: colors.error + '25',
    backgroundColor: colors.errorLight,
  },
  /** Kaçırılmış satırdaki gibi tüm kart yeşil */
  sessionRowCompleted: {
    borderColor: colors.success + '45',
    backgroundColor: colors.successLight,
  },
  missedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.error + '0D',
  },
  missedBannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedBannerTextWrap: {
    flex: 1,
  },
  missedBannerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.error,
  },
  missedBannerSub: {
    fontSize: 10,
    color: colors.error + 'AA',
    marginTop: 1,
  },
});

