import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import { NotificationService } from '../services/NotificationService';
import { DynamicIslandService } from '../services/DynamicIslandService';
import { TimerCircle } from '../components';
import { ToothGuide, CountdownOverlay, InstructionText } from '../components/brushing';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';
import {
  TOTAL_DURATION_SEC,
  getZoneFromElapsed,
  type ZoneIndex,
} from '../utils/brushingZones';
import type { BrushSession } from '../types';

const COUNTDOWN_BOUNDARIES = [90, 60, 30] as const;
const COUNTDOWN_DURATION_MS = 700;

export const BrushingTimerScreen: React.FC = () => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigation();
  const route = useRoute();
  const routeParams = route.params as { session?: BrushSession; timerEntry?: 'home' | 'brush' } | undefined;
  const session = routeParams?.session;
  /** Hangi sekmeden açıldıysa goBack yoksa bu kök ekrana dönülür (stack bağımsız navigator) */
  const timerEntry = routeParams?.timerEntry ?? 'home';

  const [seconds, setSeconds] = useState(TOTAL_DURATION_SEC);
  const [finished, setFinished] = useState(false);
  const [displayZone, setDisplayZone] = useState<ZoneIndex>(0);
  const [countdown, setCountdown] = useState<{ visible: boolean; number: 3 | 2 | 1 }>({
    visible: false,
    number: 3,
  });
  const lastTriggeredRef = useRef<number | null>(null);
  const countdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedSetRef = useRef(false);
  const secondsRef = useRef(seconds);
  secondsRef.current = seconds;
  const [rewardModal, setRewardModal] = useState<{ points: number; br: number } | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);

  const timerStartRef = useRef<number>(Date.now());
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!session || finished) return;
    const unsubscribe = nav.addListener('beforeRemove', (e: { preventDefault: () => void; data: { action: { type: string } } }) => {
      if (finished) return;
      e.preventDefault();
    });
    return unsubscribe;
  }, [nav, session, finished]);

  useEffect(() => {
    if (!session) return;
    finishedSetRef.current = false;
    timerStartRef.current = Date.now();
    setSeconds(TOTAL_DURATION_SEC);
    setFinished(false);
    setDisplayZone(0);
    lastTriggeredRef.current = null;
    setCountdown({ visible: false, number: 3 });
    setRewardModal(null);
  }, [session?.id]);

  useEffect(() => {
    if (!session) return;
    DynamicIslandService.startBrushingSession(t('brushingTime'), t('keepBrushing'), 2).catch(() => {});
    return () => {
      DynamicIslandService.endBrushingSession().catch(() => {});
    };
  }, [session?.id, t]);

  const syncTimerWithRealTime = useCallback(() => {
    const elapsed = Math.floor((Date.now() - timerStartRef.current) / 1000);
    const remaining = Math.max(0, TOTAL_DURATION_SEC - elapsed);
    setSeconds(remaining);
    if (remaining <= 0 && !finishedSetRef.current) {
      finishedSetRef.current = true;
      setFinished(true);
    }
  }, [user, session]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        syncTimerWithRealTime();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [syncTimerWithRealTime]);

  useEffect(() => {
    if (!session) return;
    const timer = setInterval(() => {
      setSeconds((s) => {
        if (s <= 0) return 0;
        if (s === 1) {
          if (!finishedSetRef.current) {
            finishedSetRef.current = true;
            setFinished(true);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [session, user]);

  // Trigger countdown when crossing 90, 60, 30
  useEffect(() => {
    if (!session || finished || countdown.visible) return;
    const elapsed = TOTAL_DURATION_SEC - seconds;
    for (const boundary of COUNTDOWN_BOUNDARIES) {
      if (seconds === boundary && lastTriggeredRef.current !== boundary) {
        lastTriggeredRef.current = boundary;
        setCountdown({ visible: true, number: 3 });
        return;
      }
    }
  }, [session, seconds, finished, countdown.visible]);

  // Countdown sequence: 3 -> 2 -> 1 -> done
  useEffect(() => {
    if (!countdown.visible) return;

    let step = 3;
    const advance = () => {
      if (step === 3) {
        setCountdown((c) => ({ ...c, number: 3 }));
        step = 2;
        countdownTimeoutRef.current = setTimeout(advance, COUNTDOWN_DURATION_MS);
      } else if (step === 2) {
        setCountdown((c) => ({ ...c, number: 2 }));
        step = 1;
        countdownTimeoutRef.current = setTimeout(advance, COUNTDOWN_DURATION_MS);
      } else {
        setCountdown((c) => ({ ...c, number: 1 }));
        countdownTimeoutRef.current = setTimeout(() => {
          setCountdown({ visible: false, number: 3 });
          const s = secondsRef.current;
          const elapsed = TOTAL_DURATION_SEC - s;
          setDisplayZone(getZoneFromElapsed(elapsed));
          lastTriggeredRef.current = null;
        }, COUNTDOWN_DURATION_MS);
      }
    };
    advance();

    return () => {
      if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
    };
  }, [countdown.visible]);

  // Re-sync displayZone when crossing boundaries (skip when finished to avoid freeze)
  useEffect(() => {
    if (countdown.visible || finished) return;
    const elapsed = TOTAL_DURATION_SEC - seconds;
    const zone = getZoneFromElapsed(elapsed);
    if (displayZone !== zone) {
      setDisplayZone(zone);
    }
  }, [seconds, countdown.visible, finished]);

  const handleRestart = () => {
    finishedSetRef.current = false;
    timerStartRef.current = Date.now();
    setSeconds(TOTAL_DURATION_SEC);
    setFinished(false);
    setDisplayZone(0);
    lastTriggeredRef.current = null;
    setRewardModal(null);
    DynamicIslandService.startBrushingSession(t('brushingTime'), t('keepBrushing'), 2).catch(() => {});
  };

  const leaveAfterReward = () => {
    setRewardModal(null);
    if (nav.canGoBack()) {
      nav.goBack();
    } else {
      const root = timerEntry === 'brush' ? 'BrushingMenuMain' : 'HomeMain';
      (nav as { navigate: (name: string) => void }).navigate(root);
    }
  };

  const handleBrushed = async () => {
    if (!session || !user) return;
    try {
      const reward = await BrushingService.completeSession(session, user);
      await DynamicIslandService.endBrushingSession();
      await refreshUser();
      await NotificationService.cancelSessionReminders(user.id, session.sessionType);
      await NotificationService.cancelMissedReminder(user.id, session.sessionType);
      setRewardModal({ points: reward.points, br: reward.br });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('couldNotSave');
      const isPermission = typeof msg === 'string' && msg.toLowerCase().includes('permission');
      setFeedbackModal({
        title: t('error'),
        message: isPermission ? t('firestorePermissionError') : msg
      });
    }
  };

  if (!session) {
    return (
      <BrandedScreenBackground>
      <View style={[styles.wrapper, { paddingTop: insets.top }]}>
        <Text style={styles.error}>{t('sessionNotFound')}</Text>
      </View>
      </BrandedScreenBackground>
    );
  }

  return (
    <BrandedScreenBackground>
    <View style={styles.wrapper}>
      <Modal
        visible={rewardModal !== null}
        transparent
        animationType="fade"
        onRequestClose={leaveAfterReward}
      >
        <View style={styles.rewardBackdrop}>
          <View style={styles.rewardCard}>
            <View style={styles.rewardIconWrap}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={styles.rewardTitle}>{t('sessionRewardTitle')}</Text>
            <Text style={styles.rewardSubtitle}>{t('sessionRewardSubtitle')}</Text>
            {rewardModal && (
              <View style={styles.rewardStatsRow}>
                <View style={styles.rewardStat}>
                  <Text style={styles.rewardStatValue}>+{rewardModal.points}</Text>
                  <Text style={styles.rewardStatLabel}>{t('pointsLabel')}</Text>
                </View>
                <View style={styles.rewardStatDivider} />
                <View style={styles.rewardStat}>
                  <Text style={styles.rewardStatValue}>+{rewardModal.br}</Text>
                  <Text style={styles.rewardStatLabel}>BR</Text>
                </View>
              </View>
            )}
            <TouchableOpacity style={styles.rewardBtn} onPress={leaveAfterReward} activeOpacity={0.88}>
              <Text style={styles.rewardBtnText}>{t('ok')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <AppFeedbackModal
        visible={feedbackModal !== null}
        title={feedbackModal?.title ?? ''}
        message={feedbackModal?.message ?? ''}
        buttonText={t('ok')}
        onClose={() => setFeedbackModal(null)}
      />
      <View style={styles.container}>
        <CountdownOverlay visible={countdown.visible} number={countdown.number} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 24 + insets.top }]}
          showsVerticalScrollIndicator={false}
        >
          {seconds <= 0 ? (
            <>
              <View style={styles.completeSection}>
                <Ionicons name="sparkles" size={48} color={colors.primary} style={styles.completeEmoji} />
                <Text style={styles.completeTitle}>{t('timeUp')}</Text>
                <Text style={styles.completeSubtitle}>
                  {t('finishQuestion')}
                </Text>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={handleBrushed}
                  activeOpacity={0.8}
                >
                  <View style={styles.btnContent}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                  <Text style={styles.btnText}> {t('finishBrushing')}</Text>
                </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnSecondary}
                  onPress={handleRestart}
                  activeOpacity={0.8}
                >
                  <View style={styles.btnContent}>
                  <Ionicons name="refresh" size={18} color={colors.primary} />
                  <Text style={styles.btnSecondaryText}> {t('repeatBrushing')}</Text>
                </View>
                </TouchableOpacity>
              </View>
              <View style={styles.timerSection}>
                <TimerCircle
                  remaining={0}
                  total={TOTAL_DURATION_SEC}
                  label=""
                />
              </View>
            </>
          ) : (
            <>
              <ToothGuide activeZone={displayZone} />
              <InstructionText zone={displayZone} />
              <View style={styles.timerSection}>
                <TimerCircle
                  remaining={seconds}
                  total={TOTAL_DURATION_SEC}
                  label={t('keepBrushing')}
                />
              </View>
              <Text style={styles.hint}>
                {t('hintUntilComplete')}
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </View>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: 'transparent' },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  timerSection: {
    marginVertical: 8,
  },
  completeSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: colors.successLight,
    borderRadius: 20,
    width: '100%',
    minHeight: 200,
  },
  completeEmoji: {
    marginBottom: 12,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 22,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    minWidth: 260,
    alignItems: 'center',
  },
  btnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  btnSecondary: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  btnSecondaryText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 20,
    textAlign: 'center',
  },
  error: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 40,
  },
  rewardBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  rewardCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    alignItems: 'center',
  },
  rewardIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primary + '22',
  },
  rewardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  rewardSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  rewardStatsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 20,
    overflow: 'hidden',
  },
  rewardStat: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardStatDivider: {
    width: 1,
    backgroundColor: colors.cardBorder,
  },
  rewardStatValue: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  rewardStatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rewardBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rewardBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
