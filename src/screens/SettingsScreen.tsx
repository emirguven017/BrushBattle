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
import { TimePicker24 } from '../components/TimePicker24';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const SettingsScreen: React.FC = () => {
  const { user, refreshUser, logOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
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
    } finally {
      setSaving(false);
    }
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
    <View style={styles.wrapper}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>⚙️ {t('settings')}</Text>
      </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>{t('language')}</Text>
        <View style={styles.languageRow}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'tr' && styles.langBtnActive]}
            onPress={() => setLanguage('tr')}
          >
            <Text style={[styles.langBtnText, language === 'tr' && styles.langBtnTextActive]}>
              🇹🇷 {t('turkish')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langBtnActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langBtnText, language === 'en' && styles.langBtnTextActive]}>
              🇬🇧 {t('english')}
            </Text>
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
          <Text style={styles.timeButtonText}>🕐 {morningTime}</Text>
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
          <Text style={styles.timeButtonText}>🌙 {eveningTime}</Text>
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

      <TouchableOpacity style={styles.logoutBtn} onPress={logOut}>
        <Text style={styles.logoutBtnText}>{t('logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white
  },
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
  logoutBtn: {
    marginTop: 12,
    backgroundColor: colors.error,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center'
  },
  logoutBtnText: { color: colors.white, fontSize: 17, fontWeight: '700' }
});
