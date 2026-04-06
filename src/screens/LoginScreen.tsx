import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Colors } from '../utils/colors';
import { AppBranding } from '../components/AppBranding';
import { AppWordmark } from '../components/AppWordmark';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useColors } from '../context/ThemeContext';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';

const REMEMBER_ME_EMAIL_KEY = '@brush_battle_remember_email';

const IOS_SEPARATOR = 'rgba(60, 60, 67, 0.29)';

export const LoginScreen: React.FC = () => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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

  const getAuthErrorCode = (error: unknown): string => {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      return String((error as { code?: string }).code ?? '');
    }
    return '';
  };

  /** Firebase auth hatalarını kullanıcı dilinde gösterir (ham "Firebase: Error (...)" metni yerine). */
  const getAuthErrorMessage = (error: unknown, flow: 'login' | 'signup' | 'reset'): string => {
    const code = getAuthErrorCode(error);

    switch (code) {
      case 'auth/email-already-in-use':
        return t('authErrorEmailInUse');
      case 'auth/weak-password':
        return t('authErrorWeakPassword');
      case 'auth/invalid-email':
        return flow === 'login' ? t('loginInvalidCredentials') : t('authErrorInvalidEmail');
      case 'auth/operation-not-allowed':
        return t('authErrorOperationNotAllowed');
      case 'auth/too-many-requests':
        return t('loginTooManyRequests');
      case 'auth/network-request-failed':
        return t('loginNetworkError');
      case 'auth/profile-creation-failed':
        return flow === 'login' ? t('loginProfileCreationFailed') : t('signUpGenericError');
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        if (flow === 'login') return t('loginInvalidCredentials');
        if (flow === 'reset') return t('authErrorResetUserNotFound');
        return t('signUpGenericError');
      case 'auth/missing-email':
        return t('emailRequired');
      default:
        if (flow === 'login') return t('loginGenericError');
        if (flow === 'signup') return t('signUpGenericError');
        return t('authErrorResetFailed');
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
      setErr(getAuthErrorMessage(e, isSignUp ? 'signup' : 'login'));
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
      setErr(getAuthErrorMessage(e, 'reset'));
    }
  };

  const scrollBottomPad = Math.max(insets.bottom, 16) + 28;
  const placeholderColor = '#8A939B';

  if (showForgotPassword) {
    return (
      <BrandedScreenBackground>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              Platform.OS === 'ios' && styles.scrollContentIOS,
              { paddingBottom: scrollBottomPad },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            {Platform.OS === 'ios' ? (
              <View style={styles.formCardIOS}>
                <AppBranding title="" tone="onLight" logoSize={106} showLogoFrame={false} style={styles.brandingBlockForgotIOS} />
                <Text style={styles.forgotDescIOS}>{t('forgotPasswordDesc')}</Text>
                <View style={styles.iosInsetGroup}>
                  <TextInput
                    style={styles.iosGroupField}
                    placeholder={t('email')}
                    placeholderTextColor={placeholderColor}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {err ? <Text style={styles.errorIOS}>{err}</Text> : null}
                {successMsg ? <Text style={styles.successIOS}>{successMsg}</Text> : null}
                <TouchableOpacity style={styles.btn} onPress={handleForgotPassword} activeOpacity={0.88}>
                  <Text style={styles.btnText}>{t('sendResetLink')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowForgotPassword(false);
                    setErr('');
                    setSuccessMsg('');
                  }}
                  hitSlop={{ top: 12, bottom: 12 }}
                >
                  <Text style={styles.switch}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.formCard}>
                <AppBranding title={t('appName')} tone="onLight" logoSize={86} showLogoFrame={false} style={styles.brandingBlockForgot} />
                <Text style={styles.forgotDesc}>{t('forgotPasswordDesc')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('email')}
                  placeholderTextColor={placeholderColor}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {err ? <Text style={styles.error}>{err}</Text> : null}
                {successMsg ? <Text style={styles.success}>{successMsg}</Text> : null}
                <TouchableOpacity style={styles.btn} onPress={handleForgotPassword} activeOpacity={0.88}>
                  <Text style={styles.btnText}>{t('sendResetLink')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setShowForgotPassword(false);
                    setErr('');
                    setSuccessMsg('');
                  }}
                  hitSlop={{ top: 12, bottom: 12 }}
                >
                  <Text style={styles.switch}>{t('cancel')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
        </KeyboardAvoidingView>
      </BrandedScreenBackground>
    );
  }

  return (
    <BrandedScreenBackground>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'ios' && styles.scrollContentIOS,
            { paddingBottom: scrollBottomPad },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {Platform.OS === 'ios' ? (
            <View style={styles.formCardIOS}>
              <AppBranding title="" tone="onLight" logoSize={124} showLogoFrame={false} style={styles.brandingBlockIOS} />
              <AppWordmark name={t('appName')} variant="login" style={styles.iosWordmark} />
              <View style={styles.iosInsetGroup}>
                {isSignUp ? (
                  <>
                    <TextInput
                      style={styles.iosGroupField}
                      placeholder={t('usernamePlaceholder')}
                      placeholderTextColor={placeholderColor}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                    />
                    <View style={styles.iosSeparator} />
                  </>
                ) : null}
                <TextInput
                  style={styles.iosGroupField}
                  placeholder={t('email')}
                  placeholderTextColor={placeholderColor}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.iosSeparator} />
                <View style={styles.iosPasswordRow}>
                  <TextInput
                    style={styles.iosPasswordInput}
                    placeholder={t('password')}
                    placeholderTextColor={placeholderColor}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.iosEyeButton}
                    onPress={() => setShowPassword((prev) => !prev)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={22}
                      color={colors.muted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              {!isSignUp ? (
                <View style={styles.authRowIOS}>
                  <TouchableOpacity
                    style={styles.rememberRow}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.rememberText}>{t('rememberMe')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowForgotPassword(true)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Text style={styles.forgotLinkText}>{t('forgotPassword')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {err ? <Text style={styles.errorIOS}>{err}</Text> : null}
              <TouchableOpacity style={styles.btn} onPress={handleSubmit} activeOpacity={0.88}>
                <Text style={styles.btnText}>{isSignUp ? t('signUp') : t('login')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setErr('');
                }}
                hitSlop={{ top: 12, bottom: 12 }}
              >
                <Text style={styles.switch}>
                  {isSignUp ? t('haveAccount') : t('noAccount')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formCard}>
              <AppBranding title={t('appName')} tone="onLight" logoSize={96} showLogoFrame={false} style={styles.brandingBlock} />
              {isSignUp ? (
                <TextInput
                  style={styles.input}
                  placeholder={t('usernamePlaceholder')}
                  placeholderTextColor={placeholderColor}
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                />
              ) : null}
              <TextInput
                style={styles.input}
                placeholder={t('email')}
                placeholderTextColor={placeholderColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.passwordInputWrap}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('password')}
                  placeholderTextColor={placeholderColor}
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
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={22}
                    color={colors.muted}
                  />
                </TouchableOpacity>
              </View>
              {!isSignUp ? (
                <View style={styles.authRow}>
                  <TouchableOpacity
                    style={styles.rememberRow}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>
                    <Text style={styles.rememberText}>{t('rememberMe')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowForgotPassword(true)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                  >
                    <Text style={styles.forgotLinkText}>{t('forgotPassword')}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {err ? <Text style={styles.error}>{err}</Text> : null}
              <TouchableOpacity style={styles.btn} onPress={handleSubmit} activeOpacity={0.88}>
                <Text style={styles.btnText}>{isSignUp ? t('signUp') : t('login')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setErr('');
                }}
                hitSlop={{ top: 12, bottom: 12 }}
              >
                <Text style={styles.switch}>
                  {isSignUp ? t('haveAccount') : t('noAccount')}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
      </KeyboardAvoidingView>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  kav: {
    flex: 1,
  },
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scroll: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 0,
    flexGrow: 1,
  },
  scrollContentIOS: {
    paddingHorizontal: 16,
    paddingTop: 12,
    justifyContent: 'center',
  },
  formCardIOS: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      default: {},
    }),
  },
  iosForgotTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  brandingBlockIOS: {
    alignSelf: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  iosWordmark: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  brandingBlockForgotIOS: {
    alignSelf: 'center',
    marginBottom: 12,
    marginTop: 2,
  },
  iosInsetGroup: {
    backgroundColor: '#F4F6F7',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7ECEA',
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      default: {},
    }),
  },
  iosSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: 16,
  },
  iosGroupField: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#111111',
    minHeight: 48,
  },
  iosPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingRight: 8,
  },
  iosPasswordInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingVertical: 13,
    paddingHorizontal: 16,
    fontSize: 17,
    color: '#111111',
    minHeight: 48,
  },
  iosEyeButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authRowIOS: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  errorIOS: {
    color: colors.error,
    marginBottom: 12,
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  successIOS: {
    color: colors.primaryDark,
    marginBottom: 12,
    fontSize: 15,
    lineHeight: 21,
    paddingHorizontal: 4,
  },
  forgotDescIOS: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  formCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 28,
    marginTop: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    ...Platform.select({
      android: {
        elevation: 6,
      },
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      default: {},
    }),
  },
  cardEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: colors.primary,
    textTransform: 'uppercase',
    textAlign: 'center',
    marginBottom: 6,
  },
  brandingBlock: {
    marginBottom: 22,
  },
  brandingBlockForgot: {
    marginBottom: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F4F6F7',
    fontSize: 16,
    color: '#111111',
    borderColor: '#E7ECEA',
  },
  passwordInputWrap: {
    borderWidth: 1,
    borderColor: '#E7ECEA',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F4F6F7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#111111',
  },
  error: {
    color: colors.error,
    marginBottom: 10,
    fontSize: 14,
    lineHeight: 20,
  },
  success: { color: colors.primaryDark, marginBottom: 10, fontSize: 14, lineHeight: 20 },
  forgotDesc: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 18,
    lineHeight: 22,
    textAlign: 'center',
  },
  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 2,
  },
  forgotLinkText: {
    fontSize: 15,
    fontWeight: '500',
    ...Platform.select({
      ios: { color: colors.primaryDark, fontWeight: '500' },
      default: { color: colors.primaryDark, fontWeight: '600', fontSize: 14 },
    }),
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 0,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 7,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  rememberText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 50,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        borderRadius: 12,
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.24,
        shadowRadius: 14,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  btnText: { color: colors.white, fontWeight: '600', fontSize: 17, letterSpacing: -0.2 },
  switch: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 16,
    ...Platform.select({
      ios: { color: colors.accent, fontWeight: '500' },
      default: { color: colors.accent, fontWeight: '600', fontSize: 15 },
    }),
  },
});
