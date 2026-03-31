import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import { NotificationService } from '../services/NotificationService';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { colors, ui } from '../utils/colors';
import { uiStyles } from '../utils/uiStyles';
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
  const { user } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigation();
  const [sessions, setSessions] = useState<BrushSession[]>([]);
  const [weekProgress, setWeekProgress] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [refreshing, setRefreshing] = useState(false);
  const [lateSessionType, setLateSessionType] = useState<SessionType | null>(null);
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
      (nav as { navigate: (name: string, params?: object) => void }).navigate('BrushingTimer', { session });
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
    if (status === 'missed') {
      setLateSessionType(sessionType);
      return;
    }
    startSessionDirect(sessionType).catch(() => {});
  };

  const handleLateBrushCancel = () => {
    setLateSessionType(null);
  };

  const handleLateBrushConfirm = () => {
    if (!lateSessionType) return;
    const type = lateSessionType;
    setLateSessionType(null);
    startSessionDirect(type).catch(() => {});
  };

  const weekdayLabels = t('weekdaysShort').split(',').slice(0, 7);

  return (
    <View style={[styles.container, uiStyles.screen]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        <View style={[uiStyles.card, styles.card]}>
          <Text style={[uiStyles.sectionTitle, styles.cardTitle]}>{t('brushingGraphTitle')}</Text>
          <Text style={styles.cardSubtitle}>{t('brushingGraphSubtitle')}</Text>
          <View style={styles.chartWrap}>
            {weekProgress.map((v, i) => (
              <View key={`${weekdayLabels[i] ?? i}`} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: v === 0 ? '0%' : `${Math.max(8, v)}%` }]} />
                </View>
                <Text style={styles.barLabel}>{weekdayLabels[i] ?? ''}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[uiStyles.card, styles.card]}>
          <View style={styles.countdownHeader}>
            <View style={styles.countdownIconWrap}>
              <Ionicons name="refresh-circle" size={20} color={colors.primary} />
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
        </View>

        <View style={[uiStyles.card, styles.card]}>
          <View style={styles.rowBetween}>
            <Text style={[uiStyles.sectionTitle, styles.cardTitle]}>{t('sessionListTitle')}</Text>
            <Text style={styles.pointHint}>+{sessionPoints} {t('pointsLabel')}</Text>
          </View>
          {plannedTypes.map((sessionType) => {
            const session = sessions.find((s) => s.sessionType === sessionType);
            const status = getEffectiveStatus(session, sessionType);
            return (
              <View key={sessionType} style={styles.sessionRow}>
                <View style={styles.sessionHead}>
                  <Text style={styles.sessionTitle}>{getSessionTitle(sessionType)}</Text>
                  <Text style={styles.sessionTime}>{getSessionTime(sessionType, session?.scheduledTime)}</Text>
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.statusText}>
                    {status === 'completed'
                      ? t('statusCompleted')
                      : status === 'missed'
                        ? t('statusMissed')
                        : status === 'due'
                          ? t('statusDue')
                          : t('statusPending')}
                  </Text>
                  <TouchableOpacity
                    style={[
                      status === 'completed' ? uiStyles.buttonSecondary : uiStyles.buttonPrimary,
                      styles.startBtn,
                      status === 'completed' && styles.startBtnSecondary
                    ]}
                    onPress={() => handleStart(sessionType, status)}
                  >
                    <Ionicons
                      name={status === 'completed' ? 'refresh' : 'play'}
                      size={14}
                      color={status === 'completed' ? colors.primary : colors.white}
                    />
                    <Text style={[styles.startBtnText, status === 'completed' && styles.startBtnTextSecondary]}>
                      {status === 'completed'
                        ? t('repeatBrushing')
                        : status === 'missed'
                          ? t('brushAnyway')
                          : t('startBrushing')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal
        visible={lateSessionType !== null}
        transparent
        animationType="fade"
        onRequestClose={handleLateBrushCancel}
      >
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
  container: { flex: 1 },
  content: { padding: ui.screenPadding, paddingBottom: ui.spacingXl },
  card: {
    marginBottom: 12,
  },
  cardTitle: { marginBottom: 0 },
  cardSubtitle: { marginTop: 2, fontSize: 11, color: colors.muted },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countdownIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successLight,
    borderWidth: ui.borderWidth,
    borderColor: colors.primary + '2A',
  },
  countdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  countdownSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: colors.muted,
  },
  countdownBadge: {
    minWidth: 36,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '18',
    borderWidth: ui.borderWidth,
    borderColor: colors.primary + '40',
  },
  countdownBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  countdownProgressBg: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.background,
    marginTop: 10,
    overflow: 'hidden',
  },
  countdownProgressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  chartWrap: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  barCol: { alignItems: 'center', width: 34 },
  barTrack: {
    width: 18,
    height: 68,
    borderRadius: 9,
    backgroundColor: colors.background,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 9,
  },
  barLabel: { marginTop: 6, fontSize: 11, color: colors.muted, fontWeight: '600' },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pointHint: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  sessionRow: {
    marginTop: 8,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    borderRadius: ui.radiusMd,
    padding: 8,
    gap: 6,
  },
  sessionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  sessionTime: { fontSize: 12, color: colors.muted, fontWeight: '700' },
  statusText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  startBtnSecondary: {
    borderColor: colors.primary,
  },
  startBtnText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  startBtnTextSecondary: { color: colors.primary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtnCancel: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  modalBtnConfirm: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

