import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BrushingService } from '../services/BrushingService';
import { NotificationService } from '../services/NotificationService';
import { TimerCircle } from '../components';
import { ToothGuide, CountdownOverlay, InstructionText } from '../components/brushing';
import {
  TOTAL_DURATION_SEC,
  getZoneFromElapsed,
  type ZoneIndex,
} from '../utils/brushingZones';
import type { BrushSession } from '../types';

const COUNTDOWN_BOUNDARIES = [90, 60, 30] as const;
const COUNTDOWN_DURATION_MS = 700;

export const BrushingTimerScreen: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const nav = useNavigation();
  const route = useRoute();
  const session = (route.params as { session?: BrushSession })?.session;

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

  // Main timer
  useEffect(() => {
    if (!session) return;
    if (seconds <= 0) {
      if (!finishedSetRef.current) {
        finishedSetRef.current = true;
        setFinished(true);
        // Fırçalama bittiği anda seans hatırlatmalarını iptal et (bildirim gelmesin)
        if (user) {
          NotificationService.cancelSessionReminders(user.id, session.sessionType).catch(() => {});
        }
      }
      return;
    }
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [session, seconds, user]);

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
          setDisplayZone((z) => Math.min(3, z + 1) as ZoneIndex);
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
    setSeconds(TOTAL_DURATION_SEC);
    setFinished(false);
    setDisplayZone(0);
    lastTriggeredRef.current = null;
  };

  const handleBrushed = async () => {
    if (!session || !user) return;
    try {
      const reward = await BrushingService.completeSession(session, user);
      Alert.alert(
        t('sessionRewardTitle'),
        `+${reward.points} ${t('pointsLabel')} • +${reward.br} BR`
      );
      await refreshUser(); // Güncel puanları göstermek için
      await NotificationService.cancelSessionReminders(user.id, session.sessionType);
      await NotificationService.cancelMissedReminder(user.id, session.sessionType);
      if (nav.canGoBack()) {
        nav.goBack();
      } else {
        (nav as { navigate: (name: string) => void }).navigate('HomeMain');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('couldNotSave');
      const isPermission = typeof msg === 'string' && msg.toLowerCase().includes('permission');
      Alert.alert(
        t('error'),
        isPermission ? t('firestorePermissionError') : msg
      );
    }
  };

  if (!session) {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.error}>{t('sessionNotFound')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <CountdownOverlay visible={countdown.visible} number={countdown.number} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
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
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
  },
});
