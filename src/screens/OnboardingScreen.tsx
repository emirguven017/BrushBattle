import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { GroupService } from '../services/GroupService';
import { TimePicker24 } from '../components/TimePicker24';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';

export const OnboardingScreen: React.FC = () => {
  const colors = useColors();
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
    <BrandedScreenBackground>
    <KeyboardAvoidingView
      style={styles.kav}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 24) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topCard}>
          <Text style={styles.welcomeTitle}>{t('welcomeTitle')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('usernamePlaceholder')}
            placeholderTextColor="#8A939B"
            value={username}
            onChangeText={setUsername}
          />
        </View>
        <View style={styles.scheduleCard}>
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

          <View style={styles.scheduleDivider} />

          <View>
            <Text style={styles.timeLabel}>{t('morningTime')}</Text>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowMorningPicker(true)}
              activeOpacity={0.7}
            >
              <View style={styles.timeButtonRow}>
                <Ionicons name="sunny-outline" size={18} color="#111111" />
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
                  <Ionicons name="sunny-outline" size={18} color="#111111" />
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
                  <Ionicons name="moon-outline" size={18} color="#111111" />
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
        </View>
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <Ionicons name="people-outline" size={34} color={colors.primary} />
            <Text style={styles.groupTitle}>{t('groupCreateOrJoin')}</Text>
            <Text style={styles.groupSubtitle}>{t('groupOptionalHint')}</Text>
          </View>
          <View style={styles.groupCreateRow}>
            <View style={styles.groupLabelRow}>
              <Ionicons name="add-circle-outline" size={14} color="#111111" />
              <Text style={styles.groupLabel}> {t('newGroupName')}</Text>
            </View>
            <TextInput
              style={styles.groupInput}
              placeholder={t('newGroupName')}
              placeholderTextColor="#8A939B"
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
              <Ionicons name="link-outline" size={14} color="#111111" />
              <Text style={styles.groupLabel}> {t('inviteCode')}</Text>
            </View>
            <TextInput
              style={styles.groupInput}
              placeholder={t('inviteCode')}
              placeholderTextColor="#8A939B"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>
        {err ? <Text style={styles.error}>{err}</Text> : null}
        <View style={styles.btnWrap}>
          <TouchableOpacity
            style={styles.btn}
            onPress={handleFinish}
            activeOpacity={0.88}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>{t('startBtn')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  kav: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    paddingHorizontal: 18,
  },
  topCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E7ECEA',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F4F6F7',
    color: '#111111',
    fontSize: 16,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5F5E',
    marginBottom: 6,
  },
  timeButton: {
    borderWidth: 1,
    borderColor: '#E7ECEA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#F4F6F7',
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111111',
  },
  timeButtonRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  timeButtonHint: {
    fontSize: 12,
    color: '#8A939B',
    marginTop: 4,
  },
  pickerContainer: {
    marginBottom: 12
  },
  scheduleCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  scheduleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginVertical: 16
  },
  perDayRow: {
    flexDirection: 'row',
    gap: 8
  },
  perDayChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E7ECEA',
    backgroundColor: '#F4F6F7',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  perDayChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '18',
  },
  perDayChipText: {
    color: '#111111',
    fontWeight: '600',
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
    borderRadius: 24,
    padding: 20,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: { elevation: 6 },
      default: {},
    }),
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
    color: '#4A5F5E',
    marginTop: 4,
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
    color: '#111111',
    marginBottom: 0,
  },
  groupInput: {
    borderWidth: 1,
    borderColor: '#E7ECEA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111111',
    backgroundColor: '#F4F6F7',
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
    color: '#8A939B',
  },
  error: { color: colors.error, marginBottom: 8, textAlign: 'center' },
  btnWrap: {
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 4,
  },
  btn: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 2,
    borderColor: colors.primaryDark + '55',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: {
        elevation: 10,
      },
      default: {},
    }),
  },
  btnText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.2,
  },
});
