import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Colors, headerTitle } from '../utils/colors';
import { createIosStyles, isIosUi } from '../utils/iosUi';
import { useColors } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { GroupService } from '../services/GroupService';
import { TimePicker24 } from '../components/TimePicker24';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const OnboardingScreen: React.FC = () => {
  const colors = useColors();
  const ios = useMemo(() => createIosStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [morningTime, setMorningTime] = useState(user?.morningTime ?? '08:00');
  const [middayTime, setMiddayTime] = useState(user?.middayTime ?? '14:00');
  const [eveningTime, setEveningTime] = useState(user?.eveningTime ?? '21:00');
  const [dailySessionCount, setDailySessionCount] = useState<1 | 2 | 3>(user?.dailySessionCount ?? 2);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [err, setErr] = useState('');
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showMiddayPicker, setShowMiddayPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);

  const handleFinish = async () => {
    if (!user?.id) return;
    setErr('');
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        username: username.trim() || user.username,
        morningTime: morningTime || '08:00',
        middayTime: middayTime || '14:00',
        eveningTime: eveningTime || '21:00',
        dailySessionCount,
        onboardingComplete: true
      });

      if (groupName.trim()) {
        await GroupService.createGroup(user.id, groupName.trim());
      } else if (inviteCode.trim()) {
        await GroupService.joinGroup(user.id, inviteCode.trim());
      }
      await refreshUser();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t('errorGeneric'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.wrapper,
        { backgroundColor: isIosUi ? colors.iosGroupedBg : colors.primary },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View
        style={[
          styles.greenHeader,
          isIosUi && { backgroundColor: colors.iosGroupedBg },
          { paddingTop: insets.top },
        ]}
      >
        <View style={[styles.titleBar, isIosUi && { backgroundColor: colors.iosGroupedBg }]}>
          <Text style={[styles.title, isIosUi && ios.iosScreenTitleText]}>{t('welcomeTitle')}</Text>
        </View>
      </View>
      <ScrollView
        style={[styles.scrollView, isIosUi && { backgroundColor: colors.iosGroupedBg }]}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput style={styles.input} placeholder={t('usernamePlaceholder')} value={username} onChangeText={setUsername} />
        <View>
          <Text style={styles.timeLabel}>{t('morningTime')}</Text>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => setShowMorningPicker(true)}
            activeOpacity={0.7}
          >
            <View style={styles.timeButtonRow}>
              <Ionicons name="sunny-outline" size={18} color={colors.text} />
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
          <View>
            <Text style={styles.timeLabel}>{t('middayTime')}</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowMiddayPicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.timeButtonRow}>
                <Ionicons name="sunny-outline" size={18} color={colors.text} />
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
          <View>
            <Text style={styles.timeLabel}>{t('eveningTime')}</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowEveningPicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.timeButtonRow}>
                <Ionicons name="moon-outline" size={18} color={colors.text} />
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
        <View style={styles.perDayWrap}>
          <Text style={styles.timeLabel}>{t('wwPerDayTitle')}</Text>
          <View style={styles.perDayRow}>
            {[1, 2, 3].map((count) => {
              const selected = dailySessionCount === count;
              return (
                <TouchableOpacity
                  key={count}
                  style={[styles.perDayChip, selected && styles.perDayChipSelected]}
                  onPress={() => setDailySessionCount(count as 1 | 2 | 3)}
                >
                  <Text style={[styles.perDayChipText, selected && styles.perDayChipTextSelected]}>
                    {count}x
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Ionicons name="people-outline" size={34} color={colors.primary} />
            <Text style={styles.groupTitle}>{t('groupCreateOrJoin')}</Text>
            <Text style={styles.groupSubtitle}>{t('groupOptionalHint')}</Text>
          </View>
          <View style={styles.groupCreateRow}>
            <View style={styles.groupLabelRow}>
              <Ionicons name="add-circle-outline" size={14} color={colors.text} />
              <Text style={styles.groupLabel}> {t('newGroupName')}</Text>
            </View>
            <TextInput
              style={styles.groupInput}
              placeholder={t('newGroupName')}
              placeholderTextColor={colors.muted}
              value={groupName}
              onChangeText={setGroupName}
            />
          </View>
          <View style={styles.groupDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('or')}</Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.groupJoinRow}>
            <View style={styles.groupLabelRow}>
              <Ionicons name="link-outline" size={14} color={colors.text} />
              <Text style={styles.groupLabel}> {t('inviteCode')}</Text>
            </View>
            <TextInput
              style={styles.groupInput}
              placeholder={t('inviteCode')}
              placeholderTextColor={colors.muted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>
        {err ? <Text style={styles.error}>{err}</Text> : null}
        <TouchableOpacity style={styles.btn} onPress={handleFinish}>
          <Text style={styles.btnText}>{t('startBtn')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  wrapper: { flex: 1 },
  greenHeader: { backgroundColor: colors.primary },
  scrollView: { flex: 1, backgroundColor: colors.background },
  container: { padding: 24, paddingBottom: 40 },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: { ...headerTitle },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.white
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6
  },
  timeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.white
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text
  },
  timeButtonRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeButtonHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4
  },
  pickerContainer: {
    marginBottom: 12
  },
  perDayWrap: {
    marginBottom: 12
  },
  perDayRow: {
    flexDirection: 'row',
    gap: 8
  },
  perDayChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  perDayChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14'
  },
  perDayChipText: {
    color: colors.text,
    fontWeight: '600'
  },
  perDayChipTextSelected: {
    color: colors.primary
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
  groupCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6
  },
  groupHeader: {
    alignItems: 'center',
    marginBottom: 20
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center'
  },
  groupSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4
  },
  groupCreateRow: {
    marginBottom: 4
  },
  groupJoinRow: {
    marginTop: 4
  },
  groupLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 0
  },
  groupInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background
  },
  groupDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted
  },
  error: { color: colors.error, marginBottom: 8 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  btnText: { color: colors.white, fontWeight: '600' }
});
