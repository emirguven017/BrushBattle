import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TimePicker24 } from '../components/TimePicker24';
import { colors, headerTitle, ui } from '../utils/colors';
import { uiStyles } from '../utils/uiStyles';
import { IOS_GROUPED_BG, iosGroupedCard, iosSectionLabelText, isIosUi } from '../utils/iosUi';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useIntro } from '../context/IntroContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { NotificationService } from '../services/NotificationService';
import { BrushingService } from '../services/BrushingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroupService } from '../services/GroupService';
import { WeeklyRewardService } from '../services/weeklyRewardService';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { AppConfirmModal } from '../components/AppConfirmModal';

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, refreshUser, logOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { requestShowIntroAgain } = useIntro();
  const [username, setUsername] = useState(user?.username ?? '');
  const [morningTime, setMorningTime] = useState(user?.morningTime ?? '08:00');
  const [middayTime, setMiddayTime] = useState(user?.middayTime ?? '14:00');
  const [eveningTime, setEveningTime] = useState(user?.eveningTime ?? '21:00');
  const [saving, setSaving] = useState(false);
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showMiddayPicker, setShowMiddayPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);
  const [dailySessionCount, setDailySessionCount] = useState<1 | 2 | 3>(user?.dailySessionCount ?? 2);
  const [toothbrushReminderEnabled, setToothbrushReminderEnabled] = useState(true);
  const [toothbrushIntervalDays, setToothbrushIntervalDays] = useState<30 | 45 | 60>(45);
  const [initialToothbrushReminderEnabled, setInitialToothbrushReminderEnabled] = useState(true);
  const [initialToothbrushIntervalDays, setInitialToothbrushIntervalDays] = useState<30 | 45 | 60>(45);
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  const initialValues = useMemo(() => ({
    username: user?.username ?? '',
    morningTime: user?.morningTime ?? '08:00',
    middayTime: user?.middayTime ?? '14:00',
    eveningTime: user?.eveningTime ?? '21:00',
    dailySessionCount: user?.dailySessionCount ?? 2,
  }), [user?.username, user?.morningTime, user?.middayTime, user?.eveningTime, user?.dailySessionCount]);

  useEffect(() => {
    if (!user?.id) return;
    setUsername(user.username ?? '');
    setMorningTime(user.morningTime ?? '08:00');
    setMiddayTime(user.middayTime ?? '14:00');
    setEveningTime(user.eveningTime ?? '21:00');
    setDailySessionCount(user.dailySessionCount ?? 2);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    NotificationService.getToothbrushReminderSettings(user.id)
      .then((s) => {
        setToothbrushReminderEnabled(s.enabled);
        setToothbrushIntervalDays(s.intervalDays);
        setInitialToothbrushReminderEnabled(s.enabled);
        setInitialToothbrushIntervalDays(s.intervalDays);
      })
      .catch(() => {});
  }, [user?.id]);

  const hasUnsavedChanges =
    username.trim() !== initialValues.username ||
    morningTime !== initialValues.morningTime ||
    middayTime !== initialValues.middayTime ||
    eveningTime !== initialValues.eveningTime ||
    dailySessionCount !== initialValues.dailySessionCount ||
    toothbrushReminderEnabled !== initialToothbrushReminderEnabled ||
    toothbrushIntervalDays !== initialToothbrushIntervalDays;

  const handleSave = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    try {
      // Bugünün seans saatlerini önce kilitle; kullanıcı saat değiştirerek geçmiş seansı kurtaramasın.
      await BrushingService.lockTodayScheduleForUser(user);
      await updateDoc(doc(db, 'users', user.id), {
        username: username.trim(),
        morningTime: morningTime || '08:00',
        middayTime: middayTime || '14:00',
        eveningTime: eveningTime || '21:00',
        dailySessionCount,
      });
      await WeeklyRewardService.syncUsernameAcrossWeeklyEntries(user.id, username.trim());
      await refreshUser();
      const updatedUser = {
        ...user,
        morningTime: morningTime || '08:00',
        middayTime: middayTime || '14:00',
        eveningTime: eveningTime || '21:00',
        dailySessionCount,
      };
      await AsyncStorage.removeItem(`daily_reminder_signature_${user.id}`);
      await NotificationService.syncDailyBaseReminders(updatedUser);
      await NotificationService.saveToothbrushReminderSettings(
        { enabled: toothbrushReminderEnabled, intervalDays: toothbrushIntervalDays },
        user.id
      );
      if (!toothbrushReminderEnabled) {
        await NotificationService.cancelToothbrushReplacementReminder(user.id);
      } else {
        await NotificationService.scheduleToothbrushReplacementReminder({
          userId: user.id,
          replaceDaysAgo: null,
          dontKnow: true,
          intervalDays: toothbrushIntervalDays,
          hour: 20,
          minute: 0,
        });
      }
      setInitialToothbrushReminderEnabled(toothbrushReminderEnabled);
      setInitialToothbrushIntervalDays(toothbrushIntervalDays);
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('couldNotSave');
      setFeedbackModal({ title: t('error'), message: msg || t('couldNotSave') });
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    user,
    username,
    morningTime,
    middayTime,
    eveningTime,
    dailySessionCount,
    refreshUser,
    toothbrushReminderEnabled,
    toothbrushIntervalDays,
    t,
  ]);

  const handleShowIntroAgain = async () => {
    await requestShowIntroAgain();
  };

  const handleLeaveGroup = () => {
    setLeaveConfirmOpen(true);
  };

  const confirmLeaveGroup = async () => {
    setLeaveConfirmOpen(false);
    if (!user?.groupId) return;
    try {
      await GroupService.leaveGroup(user.id, user.groupId);
      await refreshUser();
      setFeedbackModal({ title: t('info'), message: t('leftGroup') });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('groupActionFailed');
      setFeedbackModal({ title: t('error'), message: msg || t('groupActionFailed') });
    }
  };

  return (
    <View style={[styles.wrapper, uiStyles.screen, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}>
      {!isIosUi ? (
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{t('settings')}</Text>
          </View>
        </View>
      ) : null}
    <ScrollView
      style={[styles.container, isIosUi && { backgroundColor: IOS_GROUPED_BG }]}
      contentContainerStyle={[
        styles.content,
        uiStyles.content,
        isIosUi && { paddingHorizontal: 16 },
      ]}
    >
      <Text style={[styles.sectionHeader, isIosUi && iosSectionLabelText]}>{t('language')}</Text>
      <View style={[styles.card, isIosUi && iosGroupedCard]}>
        <View style={styles.languageRow}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'tr' && styles.langBtnActive]}
            onPress={() => setLanguage('tr')}
          >
            <View style={styles.langBtnContent}>
              <CountryFlag isoCode="tr" size={22} style={styles.flag} />
              <Text style={[styles.langBtnText, language === 'tr' && styles.langBtnTextActive]}>
                {' '}{t('turkish')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => setLanguage('en')}
          >
            <View style={styles.langBtnContent}>
              <CountryFlag isoCode="gb" size={22} style={styles.flag} />
              <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
                {' '}{t('english')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={[styles.sectionHeader, isIosUi && iosSectionLabelText]}>{t('brushingMenu')}</Text>
      <View style={[styles.card, isIosUi && iosGroupedCard]}>
        <Text style={styles.label}>{t('wwPerDayTitle')}</Text>
        <View style={styles.intervalRow}>
          {[1, 2, 3].map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.intervalChip,
                dailySessionCount === count && styles.intervalChipActive,
              ]}
              onPress={() => setDailySessionCount(count as 1 | 2 | 3)}
            >
              <Text
                style={[
                  styles.intervalChipText,
                  dailySessionCount === count && styles.intervalChipTextActive,
                ]}
              >
                {count}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionHeader, isIosUi && iosSectionLabelText]}>{t('toothbrushReminderTitle')}</Text>
      <View style={[styles.card, isIosUi && iosGroupedCard]}>
        <View style={styles.reminderRow}>
          <Text style={styles.reminderText}>{t('toothbrushReminderEnabled')}</Text>
          <Switch
            value={toothbrushReminderEnabled}
            onValueChange={setToothbrushReminderEnabled}
            trackColor={{ false: colors.cardBorder, true: colors.successLight }}
            thumbColor={toothbrushReminderEnabled ? colors.primary : '#f4f3f4'}
          />
        </View>
        <Text style={styles.reminderHint}>{t('toothbrushReminderHint')}</Text>
        <View style={styles.intervalRow}>
          {[30, 45, 60].map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles.intervalChip,
                toothbrushIntervalDays === d && styles.intervalChipActive,
                !toothbrushReminderEnabled && styles.intervalChipDisabled,
              ]}
              onPress={() => setToothbrushIntervalDays(d as 30 | 45 | 60)}
              disabled={!toothbrushReminderEnabled}
            >
              <Text
                style={[
                  styles.intervalChipText,
                  toothbrushIntervalDays === d && styles.intervalChipTextActive,
                ]}
              >
                {d} {t('daysShort')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={[styles.sectionHeader, isIosUi && iosSectionLabelText]}>{t('settings')}</Text>
      <View style={[styles.card, isIosUi && iosGroupedCard]}>
        <Text style={styles.label}>{t('username')}</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder={t('usernamePlaceholder')}
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={[styles.card, isIosUi && iosGroupedCard]}>
        <Text style={styles.label}>{t('morningTime')}</Text>
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowMorningPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.timeButtonContent}>
            <Ionicons name="sunny-outline" size={20} color={colors.text} />
            <Text style={styles.timeButtonText}> {morningTime}</Text>
          </View>
          <Text style={styles.timeButtonHint}>{t('tapToChange')}</Text>
        </TouchableOpacity>
        {showMorningPicker && (
          <View style={styles.pickerContainer}>
            <TimePicker24 value={morningTime} onChange={setMorningTime} />
            <TouchableOpacity
              style={styles.pickerDoneBtn}
              onPress={() => setShowMorningPicker(false)}
            >
              <Text style={styles.pickerDoneText}>{t('ok')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {dailySessionCount === 3 && (
        <View style={[styles.card, isIosUi && iosGroupedCard]}>
          <Text style={styles.label}>{t('middayTime')}</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowMiddayPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.timeButtonContent}>
              <Ionicons name="sunny-outline" size={20} color={colors.text} />
              <Text style={styles.timeButtonText}> {middayTime}</Text>
            </View>
            <Text style={styles.timeButtonHint}>{t('tapToChange')}</Text>
          </TouchableOpacity>
          {showMiddayPicker && (
            <View style={styles.pickerContainer}>
              <TimePicker24 value={middayTime} onChange={setMiddayTime} />
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => setShowMiddayPicker(false)}
              >
                <Text style={styles.pickerDoneText}>{t('ok')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      {dailySessionCount >= 2 && (
        <View style={[styles.card, isIosUi && iosGroupedCard]}>
          <Text style={styles.label}>{t('eveningTime')}</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowEveningPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.timeButtonContent}>
              <Ionicons name="moon-outline" size={20} color={colors.text} />
              <Text style={styles.timeButtonText}> {eveningTime}</Text>
            </View>
            <Text style={styles.timeButtonHint}>{t('tapToChange')}</Text>
          </TouchableOpacity>
          {showEveningPicker && (
            <View style={styles.pickerContainer}>
              <TimePicker24 value={eveningTime} onChange={setEveningTime} />
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => setShowEveningPicker(false)}
              >
              <Text style={styles.pickerDoneText}>{t('ok')}</Text>
            </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.saveBtn,
          isIosUi && { borderRadius: 12, minHeight: 50 },
          (!hasUnsavedChanges || saving) && styles.saveBtnDisabled,
        ]}
        onPress={() => { handleSave().catch(() => {}); }}
        disabled={!hasUnsavedChanges || saving}
      >
        <Text style={styles.saveBtnText}>
          {saving ? t('saving') : t('save')}
        </Text>
      </TouchableOpacity>

      {user?.groupId && (
        <TouchableOpacity
          style={styles.leaveBtn}
          onPress={handleLeaveGroup}
        >
          <Text style={styles.leaveBtnText}>{t('leaveGroup')}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.showIntroBtn} onPress={handleShowIntroAgain}>
        <Text style={styles.showIntroBtnText}>{t('showIntroAgain')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.logoutBtn} onPress={logOut}>
        <Text style={styles.logoutBtnText}>{t('logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
    <AppFeedbackModal
      visible={feedbackModal !== null}
      title={feedbackModal?.title ?? ''}
      message={feedbackModal?.message ?? ''}
      buttonText={t('ok')}
      onClose={() => setFeedbackModal(null)}
    />
    <AppConfirmModal
      visible={leaveConfirmOpen}
      title={t('leaveGroup')}
      message={t('leaveGroupConfirm')}
      cancelText={t('cancel')}
      confirmText={t('leave')}
      onCancel={() => setLeaveConfirmOpen(false)}
      onConfirm={() => { confirmLeaveGroup().catch(() => {}); }}
    />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  greenHeader: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  content: {},
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: {
    ...headerTitle
  },
  langBtnContent: { flexDirection: 'row', alignItems: 'center' },
  flag: { borderRadius: 2, overflow: 'hidden' },
  timeButtonContent: { flexDirection: 'row', alignItems: 'center' },
  sectionHeader: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    padding: ui.cardPadding,
    marginBottom: 10,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: ui.radiusMd,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    backgroundColor: colors.background
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.successLight
  },
  langBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.muted
  },
  langBtnTextActive: {
    color: colors.primary
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8
  },
  input: {
    ...uiStyles.input
  },
  timeButton: {
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    borderRadius: ui.radiusMd,
    padding: 14,
    backgroundColor: colors.background
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  timeButtonHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4
  },
  pickerContainer: {
    marginTop: 8
  },
  pickerDoneBtn: {
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: 'center'
  },
  pickerDoneText: {
    color: colors.white,
    fontWeight: '600'
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  reminderHint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  intervalRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  intervalChip: {
    flex: 1,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    backgroundColor: colors.background,
    borderRadius: ui.radiusSm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  intervalChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.successLight,
  },
  intervalChipDisabled: {
    opacity: 0.5,
  },
  intervalChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.muted,
  },
  intervalChipTextActive: {
    color: colors.primary,
  },
  saveBtn: {
    ...uiStyles.buttonPrimary,
    borderRadius: ui.radiusMd,
    alignItems: 'center',
    marginTop: 12
  },
  saveBtnDisabled: {
    opacity: 0.5
  },
  saveBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  leaveBtn: {
    marginTop: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: ui.radiusMd,
    backgroundColor: colors.card
  },
  leaveBtnText: { color: colors.warning, fontSize: 16, fontWeight: '600' },
  showIntroBtn: {
    marginTop: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: ui.radiusMd
  },
  showIntroBtnText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  logoutBtn: {
    marginTop: 10,
    backgroundColor: colors.error,
    borderRadius: ui.radiusMd,
    padding: 14,
    alignItems: 'center'
  },
  logoutBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' }
});
