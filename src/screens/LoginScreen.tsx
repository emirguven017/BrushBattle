import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const REMEMBER_ME_EMAIL_KEY = '@brush_battle_remember_email';

export const LoginScreen: React.FC = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [err, setErr] = useState('');
  const { signUp, logIn } = useAuth();

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_ME_EMAIL_KEY).then((saved) => {
      if (saved) setEmail(saved);
    });
  }, []);

  const handleSubmit = async () => {
    setErr('');
    try {
      if (isSignUp) {
        if (!username.trim()) {
          setErr(t('usernameRequired'));
          return;
        }
        await signUp(email.trim(), password, username.trim());
      } else {
        await logIn(email.trim(), password, rememberMe);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('somethingWrong');
      setErr(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.titleBar}>
        <Text style={styles.titleBarText}>🪥 {t('appName')}</Text>
        <Text style={styles.titleBarSub}>{t('appTagline')}</Text>
      </View>
      <View style={styles.container}>
      {isSignUp && (
        <TextInput
          style={styles.input}
          placeholder={t('usernamePlaceholder')}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
      )}
      <TextInput
        style={styles.input}
        placeholder={t('email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder={t('password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {!isSignUp && (
        <TouchableOpacity
          style={styles.rememberRow}
          onPress={() => setRememberMe(!rememberMe)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
            {rememberMe && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.rememberText}>{t('rememberMe')}</Text>
        </TouchableOpacity>
      )}
      {err ? <Text style={styles.error}>{err}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={handleSubmit}>
        <Text style={styles.btnText}>{isSignUp ? t('signUp') : t('login')}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { setIsSignUp(!isSignUp); setErr(''); }}>
        <Text style={styles.switch}>
          {isSignUp ? t('haveAccount') : t('noAccount')}
        </Text>
      </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center'
  },
  titleBarText: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white
  },
  titleBarSub: {
    fontSize: 13,
    color: colors.white,
    opacity: 0.9,
    marginTop: 4
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    backgroundColor: colors.white,
    fontSize: 16
  },
  error: { color: colors.error, marginBottom: 8 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 6,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxChecked: {
    backgroundColor: colors.primary
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold'
  },
  rememberText: {
    fontSize: 16,
    color: colors.primary
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 8
  },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 17 },
  switch: { color: colors.accent, marginTop: 20, textAlign: 'center', fontSize: 15 }
});
