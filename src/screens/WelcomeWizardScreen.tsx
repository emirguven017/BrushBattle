import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../utils/colors';
import { IOS_GROUPED_BG, isIosUi } from '../utils/iosUi';
import { useLanguage } from '../context/LanguageContext';
import { NotificationService } from '../services/NotificationService';
import {
  WELCOME_WIZARD_DONE_KEY,
  WELCOME_WIZARD_DATA_KEY,
  WELCOME_WIZARD_STEP_COUNT,
  welcomeWizardAccountDoneKey,
} from '../constants/welcomeWizard';

const APP_LOGO = require('../../assets/images/app-logo.png');

type WeekStart = 'monday' | 'saturday' | 'sunday';
type BrushType = 'manual' | 'rotary' | 'sonic';
type FlossHabit = 'floss' | 'water' | 'both' | 'none';

interface WelcomeWizardScreenProps {
  onComplete: () => void;
  /** device: çıkışlı ilk kurulum. account: yeni kayıt sonrası onboarding akışı */
  mode?: 'device' | 'account';
  userId?: string;
}

const defaultDob = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d;
};

export const WelcomeWizardScreen: React.FC<WelcomeWizardScreenProps> = ({
  onComplete,
  mode = 'device',
  userId,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [weekStart, setWeekStart] = useState<WeekStart>('monday');
  const [brushType, setBrushType] = useState<BrushType>('manual');
  const [replaceDays, setReplaceDays] = useState('');
  const [replaceDontKnow, setReplaceDontKnow] = useState(false);
  const [dob, setDob] = useState(defaultDob);
  const [showDobPicker, setShowDobPicker] = useState(Platform.OS === 'ios');
  const [floss, setFloss] = useState<FlossHabit>('both');
  const [perDay, setPerDay] = useState<1 | 2 | 3>(2);
  const [durationMin, setDurationMin] = useState<1 | 2 | 3>(2);
  const [personalProgress, setPersonalProgress] = useState(0);
  const [personalDone, setPersonalDone] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (step !== 9) return;
    setPersonalProgress(0);
    setPersonalDone(false);
    const t0 = Date.now();
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 2200);
      setPersonalProgress(p);
      if (p >= 1) {
        setPersonalDone(true);
        clearInterval(id);
      }
    }, 40);
    return () => clearInterval(id);
  }, [step]);

  const persistAndFinish = useCallback(async () => {
    setSaving(true);
    try {
      const payload = {
        displayName: displayName.trim(),
        weekStart,
        brushType,
        replaceDays: replaceDontKnow ? null : parseInt(replaceDays, 10) || null,
        replaceDontKnow,
        dob: dob.toISOString(),
        floss,
        perDay,
        durationMin,
        savedAt: Date.now(),
      };
      if (mode === 'account' && userId) {
        await AsyncStorage.setItem(welcomeWizardAccountDoneKey(userId), 'true');
      } else {
        await AsyncStorage.setItem(WELCOME_WIZARD_DONE_KEY, 'true');
      }
      await AsyncStorage.setItem(WELCOME_WIZARD_DATA_KEY, JSON.stringify(payload));
      await NotificationService.scheduleToothbrushReplacementReminder({
        userId: mode === 'account' ? userId : undefined,
        replaceDaysAgo: payload.replaceDays,
        dontKnow: payload.replaceDontKnow,
        intervalDays: 45,
        hour: 20,
        minute: 0,
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  }, [
    mode,
    userId,
    displayName,
    weekStart,
    brushType,
    replaceDays,
    replaceDontKnow,
    dob,
    floss,
    perDay,
    durationMin,
    onComplete,
  ]);

  const goNext = () => {
    if (step < WELCOME_WIZARD_STEP_COUNT - 1) setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return displayName.trim().length >= 1;
      case 2:
      case 3:
      case 5:
      case 6:
      case 7:
      case 8:
        return true;
      case 4:
        return replaceDontKnow || (replaceDays.trim() !== '' && !Number.isNaN(parseInt(replaceDays, 10)));
      case 9:
        return personalDone;
      case 10:
        return true;
      case 11:
        return true;
      default:
        return true;
    }
  }, [step, displayName, replaceDays, replaceDontKnow, personalDone]);

  const onPrimaryPress = async () => {
    if (step === 0) {
      goNext();
      return;
    }
    if (step === 11) {
      await NotificationService.requestPermissions();
      await persistAndFinish();
      return;
    }
    if (step === WELCOME_WIZARD_STEP_COUNT - 2) {
      goNext();
      return;
    }
    if (canProceed) goNext();
  };

  const skipNotif = async () => {
    await persistAndFinish();
  };

  const chooseRestore = async () => {
    await AsyncStorage.removeItem(WELCOME_WIZARD_DATA_KEY);
    if (mode === 'account' && userId) {
      await AsyncStorage.setItem(welcomeWizardAccountDoneKey(userId), 'true');
    } else {
      await AsyncStorage.setItem(WELCOME_WIZARD_DONE_KEY, 'true');
    }
    onComplete();
  };

  const renderProgress = () => (
    <View style={styles.progressRow}>
      {Array.from({ length: WELCOME_WIZARD_STEP_COUNT }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressDot, i === step && styles.progressDotActive]}
        />
      ))}
    </View>
  );

  const Card = ({
    selected,
    onPress,
    icon,
    title,
    subtitle,
    badge,
  }: {
    selected: boolean;
    onPress: () => void;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    badge?: string;
  }) => (
    <TouchableOpacity
      style={[styles.optionCard, selected && styles.optionCardSelected]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
      </View>
      <Ionicons name={icon} size={22} color={selected ? colors.primaryDark : colors.muted} style={styles.optionIcon} />
      <View style={styles.optionTextCol}>
        <View style={styles.optionTitleRow}>
          <Text style={styles.optionTitle}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
        {subtitle ? <Text style={styles.optionSubtitle}>{subtitle}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  const headerIcon = (name: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.heroIconCircle}>
      <Ionicons name={name} size={40} color={colors.primary} />
    </View>
  );

  const HeroTooth = ({ compact }: { compact?: boolean }) => {
    const side = compact ? 52 : 64;
    return (
      <View style={[styles.heroIconCircle, compact && styles.heroIconCircleCompact]}>
        <Image source={APP_LOGO} style={{ width: side, height: side }} resizeMode="contain" />
      </View>
    );
  };

  let body: React.ReactNode = null;

  switch (step) {
    case 0:
      body = (
        <>
          <HeroTooth />
          <Text style={styles.screenTitle}>{t('wwEntryTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('wwEntrySubtitle')}</Text>
          <TouchableOpacity style={styles.entryCard} onPress={goNext} activeOpacity={0.9}>
            <View style={styles.entryCardIconWrap}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
            </View>
            <Text style={styles.entryCardTitle}>{t('wwEntryNewTitle')}</Text>
            <Text style={styles.entryCardDesc}>{t('wwEntryNewDesc')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.entryCardMuted} onPress={chooseRestore} activeOpacity={0.9}>
            <View style={styles.entryCardIconWrap}>
              <Ionicons name="cloud-upload-outline" size={32} color={colors.accent} />
            </View>
            <Text style={styles.entryCardTitle}>{t('wwEntryRestoreTitle')}</Text>
            <Text style={styles.entryCardDesc}>{t('wwEntryRestoreDesc')}</Text>
          </TouchableOpacity>
        </>
      );
      break;
    case 1:
      body = (
        <>
          {headerIcon('hand-left-outline')}
          <Text style={styles.screenTitle}>{t('wwNameTitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('wwNamePlaceholder')}
            placeholderTextColor={colors.muted}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        </>
      );
      break;
    case 2:
      body = (
        <>
          {headerIcon('calendar-outline')}
          <Text style={styles.screenTitle}>{t('wwWeekTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('wwWeekSubtitle')}</Text>
          <Card
            selected={weekStart === 'monday'}
            onPress={() => setWeekStart('monday')}
            icon="calendar-outline"
            title={t('wwWeekMon')}
          />
          <Card
            selected={weekStart === 'saturday'}
            onPress={() => setWeekStart('saturday')}
            icon="calendar-outline"
            title={t('wwWeekSat')}
          />
          <Card
            selected={weekStart === 'sunday'}
            onPress={() => setWeekStart('sunday')}
            icon="calendar-outline"
            title={t('wwWeekSun')}
          />
        </>
      );
      break;
    case 3:
      body = (
        <>
          <HeroTooth compact />
          <Text style={styles.screenTitle}>{t('wwBrushTypeTitle')}</Text>
          <Card
            selected={brushType === 'manual'}
            onPress={() => setBrushType('manual')}
            icon="hand-left-outline"
            title={t('wwBrushManual')}
            subtitle={t('wwBrushManualDesc')}
          />
          <Card
            selected={brushType === 'rotary'}
            onPress={() => setBrushType('rotary')}
            icon="sync-outline"
            title={t('wwBrushRotary')}
            subtitle={t('wwBrushRotaryDesc')}
          />
          <Card
            selected={brushType === 'sonic'}
            onPress={() => setBrushType('sonic')}
            icon="flash-outline"
            title={t('wwBrushSonic')}
            subtitle={t('wwBrushSonicDesc')}
          />
        </>
      );
      break;
    case 4:
      body = (
        <>
          <HeroTooth compact />
          <Text style={styles.screenTitle}>{t('wwReplaceTitle')}</Text>
          <View style={styles.inlineInputRow}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder={t('wwReplacePlaceholder')}
              placeholderTextColor={colors.muted}
              value={replaceDays}
              onChangeText={(x) => {
                setReplaceDays(x);
                setReplaceDontKnow(false);
              }}
              keyboardType="number-pad"
              editable={!replaceDontKnow}
            />
            <Text style={styles.inputSuffix}>{t('wwReplaceSuffix')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.optionCard, replaceDontKnow && styles.optionCardSelected]}
            onPress={() => {
              setReplaceDontKnow((v) => !v);
              if (!replaceDontKnow) setReplaceDays('');
            }}
            activeOpacity={0.88}
          >
            <View style={[styles.radioOuter, replaceDontKnow && styles.radioOuterSelected]}>
              {replaceDontKnow ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
            </View>
            <Ionicons name="help-circle-outline" size={26} color={colors.muted} style={styles.shrugIcon} />
            <Text style={[styles.optionTitle, { flex: 1 }]}>{t('wwReplaceDontKnow')}</Text>
          </TouchableOpacity>
          {replaceDontKnow ? (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.infoBoxText}>{t('wwReplaceHint')}</Text>
            </View>
          ) : null}
        </>
      );
      break;
    case 5:
      body = (
        <>
          {headerIcon('gift-outline')}
          <Text style={styles.screenTitle}>{t('wwDobTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('wwDobSubtitle')}</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={dob}
              mode="date"
              display="spinner"
              onChange={(_, d) => d && setDob(d)}
              themeVariant="light"
              style={styles.dobPicker}
            />
          ) : (
            <>
              <TouchableOpacity style={styles.input} onPress={() => setShowDobPicker(true)}>
                <Text style={{ color: colors.text }}>{dob.toLocaleDateString()}</Text>
              </TouchableOpacity>
              {showDobPicker ? (
                <DateTimePicker
                  value={dob}
                  mode="date"
                  display="default"
                  onChange={(e, d) => {
                    if (Platform.OS === 'android') setShowDobPicker(false);
                    if (e.type === 'dismissed') return;
                    if (d) setDob(d);
                  }}
                />
              ) : null}
            </>
          )}
        </>
      );
      break;
    case 6:
      body = (
        <>
          {headerIcon('ribbon-outline')}
          <Text style={styles.screenTitle}>{t('wwFlossTitle')}</Text>
          <Card
            selected={floss === 'floss'}
            onPress={() => setFloss('floss')}
            icon="git-branch-outline"
            title={t('wwFlossYes')}
            subtitle={t('wwFlossYesDesc')}
          />
          <Card
            selected={floss === 'water'}
            onPress={() => setFloss('water')}
            icon="water-outline"
            title={t('wwFlossWater')}
            subtitle={t('wwFlossWaterDesc')}
          />
          <Card
            selected={floss === 'both'}
            onPress={() => setFloss('both')}
            icon="star-outline"
            title={t('wwFlossBoth')}
            subtitle={t('wwFlossBothDesc')}
            badge={t('wwRecommended')}
          />
          <Card
            selected={floss === 'none'}
            onPress={() => setFloss('none')}
            icon="close-circle-outline"
            title={t('wwFlossNone')}
            subtitle={t('wwFlossNoneDesc')}
          />
        </>
      );
      break;
    case 7:
      body = (
        <>
          <HeroTooth compact />
          <Text style={styles.screenTitle}>{t('wwPerDayTitle')}</Text>
          <Card
            selected={perDay === 1}
            onPress={() => setPerDay(1)}
            icon="sad-outline"
            title={t('wwOnce')}
            subtitle={t('wwOnceDesc')}
          />
          <Card
            selected={perDay === 2}
            onPress={() => setPerDay(2)}
            icon="happy-outline"
            title={t('wwTwice')}
            subtitle={t('wwTwiceDesc')}
          />
          <Card
            selected={perDay === 3}
            onPress={() => setPerDay(3)}
            icon="sparkles-outline"
            title={t('wwThrice')}
            subtitle={t('wwThriceDesc')}
            badge={t('wwRecommended')}
          />
        </>
      );
      break;
    case 8:
      body = (
        <>
          {headerIcon('timer-outline')}
          <Text style={styles.screenTitle}>{t('wwDurationTitle')}</Text>
          <Card
            selected={durationMin === 1}
            onPress={() => setDurationMin(1)}
            icon="flash-outline"
            title={t('wwMin1')}
            subtitle={t('wwMin1Desc')}
          />
          <Card
            selected={durationMin === 2}
            onPress={() => setDurationMin(2)}
            icon="checkbox-outline"
            title={t('wwMin2')}
            subtitle={t('wwMin2Desc')}
            badge={t('wwRecommended')}
          />
          <Card
            selected={durationMin === 3}
            onPress={() => setDurationMin(3)}
            icon="star-outline"
            title={t('wwMin3')}
            subtitle={t('wwMin3Desc')}
          />
        </>
      );
      break;
    case 9:
      body = (
        <>
          {headerIcon('flask-outline')}
          <Text style={styles.screenTitle}>{t('wwPersonalTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('wwPersonalSubtitle')}</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.round(personalProgress * 100)}%` }]} />
          </View>
          {personalDone ? (
            <View style={styles.checkRow}>
              <View style={styles.checkBubble}>
                <Ionicons name="checkmark" size={18} color={colors.success} />
              </View>
              <Text style={styles.checkText}>{t('wwPersonalDone')}</Text>
            </View>
          ) : (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
          )}
        </>
      );
      break;
    case 10:
      body = (
        <>
          {headerIcon('bar-chart-outline')}
          <Text style={styles.screenTitle}>{t('wwPreviewTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('wwPreviewSubtitle')}</Text>
          <View style={styles.chartCard}>
            <View style={styles.chartBars}>
              {[0.35, 0.55, 0.4, 0.7, 0.5, 0.45, 0.6].map((h, i) => (
                <View key={i} style={styles.barWrap}>
                  <View style={[styles.bar, { height: 24 + h * 56 }]} />
                </View>
              ))}
            </View>
            <View style={styles.chartLabels}>
              {t('weekdaysShort')
                .split(',')
                .map((d) => (
                  <Text key={d} style={styles.chartDay}>
                    {d}
                  </Text>
                ))}
            </View>
            <View style={styles.chartStats}>
              <View style={styles.chartStat}>
                <Text style={styles.chartStatNum}>14</Text>
                <Text style={styles.chartStatLbl}>{t('wwPreviewBrushing')}</Text>
              </View>
              <View style={styles.chartStatSep} />
              <View style={styles.chartStat}>
                <Text style={styles.chartStatNum}>2:08</Text>
                <Text style={styles.chartStatLbl}>{t('wwPreviewAvg')}</Text>
              </View>
              <View style={styles.chartStatSep} />
              <View style={styles.chartStat}>
                <Text style={styles.chartStatNum}>7</Text>
                <Text style={styles.chartStatLbl}>{t('wwPreviewStreak')}</Text>
              </View>
            </View>
          </View>
        </>
      );
      break;
    case 11:
      body = (
        <>
          {headerIcon('notifications-outline')}
          <Text style={styles.screenTitle}>{t('wwNotifTitle')}</Text>
          <Text style={styles.screenSubtitle}>{t('wwNotifBody')}</Text>
          <View style={styles.notifMock}>
            <View style={styles.notifMockHeader}>
              <Image source={APP_LOGO} style={styles.notifMockLogo} resizeMode="contain" />
              <Text style={styles.notifMockApp}>{t('appName')}</Text>
              <Text style={styles.notifMockNow}>now</Text>
            </View>
            <Text style={styles.notifMockTitle}>{t('wwNotifPreviewTitle')}</Text>
            <Text style={styles.notifMockBody}>{t('wwNotifPreviewBody')}</Text>
          </View>
          <Text style={styles.notifHint}>{t('wwNotifAllowHint')}</Text>
        </>
      );
      break;
    default:
      body = null;
  }

  const showBack = step > 0;
  const showMainCta = step !== 0;
  const primaryLabel =
    step === 10 ? t('wwPreviewCta') : step === 11 ? t('wwNotifEnable') : t('wwNext');
  const primaryIcon =
    step === 10 || step === 11 ? undefined : ('arrow-forward' as const);

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top },
        isIosUi && { backgroundColor: IOS_GROUPED_BG },
      ]}
    >
      <View style={styles.topBar}>
        {showBack ? (
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={isIosUi ? '#007AFF' : colors.accent} />
            <Text style={[styles.backText, isIosUi && { color: '#007AFF' }]}>{t('wwBack')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}
      </View>
      {renderProgress()}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {body}
      </ScrollView>
      {showMainCta ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, (!canProceed || saving) && styles.primaryBtnDisabled]}
            onPress={onPrimaryPress}
            disabled={!canProceed || saving}
            activeOpacity={0.9}
          >
            {saving ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                {step === 11 ? (
                  <Ionicons name="notifications" size={20} color={colors.white} />
                ) : null}
                <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
                {primaryIcon ? <Ionicons name={primaryIcon} size={18} color={colors.white} /> : null}
              </>
            )}
          </TouchableOpacity>
          {step === 11 ? (
            <TouchableOpacity onPress={skipNotif} disabled={saving} style={styles.textLink}>
              <Text style={styles.textLinkLabel}>{t('wwNotifLater')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topBar: { paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8 },
  backText: { fontSize: 16, color: colors.accent, fontWeight: '600' },
  backPlaceholder: { height: 44 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardBorder,
  },
  progressDotActive: {
    width: 22,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  heroIconCircle: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + '22',
  },
  heroIconCircleCompact: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  entryCardIconWrap: {
    marginBottom: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 28,
  },
  screenSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  entryCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  entryCardMuted: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  entryCardTitle: { fontSize: 17, fontWeight: '800', color: colors.text, textAlign: 'center' },
  entryCardDesc: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  inputFlex: { flex: 1 },
  inlineInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  inputSuffix: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.successLight,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOuterSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionIcon: { marginTop: 2 },
  optionTextCol: { flex: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  optionSubtitle: { fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 18 },
  badge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  shrugIcon: { marginRight: 6, marginTop: 1 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: colors.successLight,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + '22',
    marginTop: 8,
  },
  infoBoxText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  dobPicker: { alignSelf: 'stretch', height: 180 },
  progressBarBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.cardBorder,
    overflow: 'hidden',
    marginTop: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20, gap: 12, alignSelf: 'flex-start' },
  checkBubble: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { fontSize: 15, fontWeight: '600', color: colors.text },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    paddingHorizontal: 4,
  },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: {
    width: '55%',
    maxWidth: 28,
    borderRadius: 6,
    backgroundColor: colors.primary,
    opacity: 0.85,
  },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  chartDay: { fontSize: 10, color: colors.muted, flex: 1, textAlign: 'center' },
  chartStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  chartStat: { flex: 1, alignItems: 'center' },
  chartStatSep: { width: 1, backgroundColor: colors.cardBorder },
  chartStatNum: { fontSize: 22, fontWeight: '800', color: colors.primary },
  chartStatLbl: { fontSize: 11, color: colors.muted, marginTop: 4, fontWeight: '600' },
  notifMock: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginTop: 8,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  notifMockHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  notifMockLogo: { width: 22, height: 22 },
  notifMockApp: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text },
  notifMockNow: { fontSize: 12, color: colors.muted },
  notifMockTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  notifMockBody: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  notifHint: { fontSize: 13, color: colors.accent, textAlign: 'center', marginTop: 16 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: colors.white, fontSize: 17, fontWeight: '800' },
  textLink: { paddingVertical: 14, alignItems: 'center' },
  textLinkLabel: { fontSize: 15, color: colors.muted, fontWeight: '600' },
});
