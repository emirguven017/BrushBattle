import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';

export const SplashScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  return (
  <View style={[styles.container, { backgroundColor: colors.primary }]}>
    <View style={{ paddingTop: insets.top }} />
    <View style={styles.titleBar}>
      <Text style={styles.title}>{t('appName')}</Text>
      <Text style={styles.subtitle}>{t('splashSubtitle')}</Text>
    </View>
    <ActivityIndicator size="large" color={colors.white} style={styles.spinner} />
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 24,
    paddingHorizontal: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 32
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.white
  },
  subtitle: {
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
    marginTop: 6
  },
  spinner: {}
});
