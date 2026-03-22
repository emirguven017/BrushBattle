import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TimePicker24 } from '../components/TimePicker24';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useIntro } from '../context/IntroContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { NotificationService } from '../services/NotificationService';

export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user, refreshUser, logOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { requestShowIntroAgain } = useIntro();
  const [username, setUsername] = useState(user?.username ?? '');
  const [morningTime, setMorningTime] = useState(user?.morningTime ?? '08:00');
  const [eveningTime, setEveningTime] = useState(user?.eveningTime ?? '21:00');
  const [saving, setSaving] = useState(false);
  const [showMorningPicker, setShowMorningPicker] = useState(false);
  const [showEveningPicker, setShowEveningPicker] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.id), {
        username: username.trim(),
        morningTime: morningTime || '08:00',
        eveningTime: eveningTime || '21:00'
      });
      await refreshUser();
      const updatedUser = { ...user, morningTime: morningTime || '08:00', eveningTime: eveningTime || '21:00' };
      await NotificationService.syncDailyBaseReminders(updatedUser);
    } finally {
      setSaving(false);
    }
  };

  const handleShowIntroAgain = async () => {
    await requestShowIntroAgain();
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      t('leaveGroup'),
      t('leaveGroupConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        { text: t('leave'), style: 'destructive', onPress: () => {} }
      ]
    );
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.primary }]}>
      <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
        <View style={styles.titleBar}>
        <Text style={styles.title}>{t('settings')}</Text>
        </View>
      </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>{t('language')}</Text>
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

      <View style={styles.card}>
        <Text style={styles.label}>{t('username')}</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder={t('usernamePlaceholder')}
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.card}>
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

      <View style={styles.card}>
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

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSave}
        disabled={saving}
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
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  greenHeader: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white
  },
  langBtnContent: { flexDirection: 'row', alignItems: 'center' },
  flag: { borderRadius: 2, overflow: 'hidden' },
  timeButtonContent: { flexDirection: 'row', alignItems: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4
  },
  languageRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4
  },
  langBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
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
    fontSize: 14,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text
  },
  timeButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.background
  },
  timeButtonText: {
    fontSize: 18,
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
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 16
  },
  saveBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  leaveBtn: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center'
  },
  leaveBtnText: { color: colors.warning, fontSize: 16, fontWeight: '600' },
  showIntroBtn: {
    marginTop: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 16
  },
  showIntroBtnText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  logoutBtn: {
    marginTop: 12,
    backgroundColor: colors.error,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center'
  },
  logoutBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' }
});
