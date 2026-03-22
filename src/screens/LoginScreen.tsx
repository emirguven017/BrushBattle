import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';

const REMEMBER_ME_EMAIL_KEY = '@brush_battle_remember_email';

export const LoginScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { signUp, logIn, resetPassword } = useAuth();

  const getLoginErrorMessage = (error: unknown): string => {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: string }).code)
      : '';

    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return t('loginInvalidCredentials');
      case 'auth/too-many-requests':
        return t('loginTooManyRequests');
      case 'auth/network-request-failed':
        return t('loginNetworkError');
      case 'auth/profile-creation-failed':
        return t('loginProfileCreationFailed');
      default:
        return t('loginGenericError');
    }
  };

  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_ME_EMAIL_KEY).then((saved) => {
      if (saved) setEmail(saved);
    });
  }, []);

  const handleSubmit = async () => {
    setErr('');
    setSuccessMsg('');
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
      if (!isSignUp) {
        setErr(getLoginErrorMessage(e));
        return;
      }
      const msg = e instanceof Error ? e.message : t('somethingWrong');
      setErr(msg);
    }
  };

  const handleForgotPassword = async () => {
    setErr('');
    setSuccessMsg('');
    if (!email.trim()) {
      setErr(t('emailRequired'));
      return;
    }
    try {
      await resetPassword(email.trim());
      setSuccessMsg(t('resetLinkSent'));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('resetLinkFailed');
      setErr(msg);
    }
  };

  if (showForgotPassword) {
    return (
      <KeyboardAvoidingView
        style={[styles.wrapper, { backgroundColor: colors.primary }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.titleBarText}>{t('appName')}</Text>
            <Text style={styles.titleBarSub}>{t('forgotPasswordTitle')}</Text>
          </View>
          <View style={styles.container}>
            <Text style={styles.forgotDesc}>{t('forgotPasswordDesc')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {err ? <Text style={styles.error}>{err}</Text> : null}
            {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}
            <TouchableOpacity style={styles.btn} onPress={handleForgotPassword}>
              <Text style={styles.btnText}>{t('sendResetLink')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setShowForgotPassword(false);
                setErr('');
                setSuccessMsg('');
              }}
            >
              <Text style={styles.switch}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.wrapper, { backgroundColor: colors.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
      <View style={styles.titleBar}>
        <Text style={styles.titleBarText}>{t('appName')}</Text>
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
      <View style={styles.passwordInputWrap}>
        <TextInput
          style={styles.passwordInput}
          placeholder={t('password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.muted}
          />
        </TouchableOpacity>
      </View>
      {!isSignUp && (
        <View style={styles.authRow}>
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
          <TouchableOpacity
            onPress={() => setShowForgotPassword(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotLinkText}>{t('forgotPassword')}</Text>
          </TouchableOpacity>
        </View>
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
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  greenHeader: { flex: 1, backgroundColor: colors.primary },
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
  passwordInputWrap: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center'
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16
  },
  error: { color: colors.error, marginBottom: 8 },
  success: { color: colors.primary, marginBottom: 8, fontSize: 14 },
  forgotDesc: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 16,
    lineHeight: 22
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  forgotLinkText: { color: colors.accent, fontSize: 14 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0
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
