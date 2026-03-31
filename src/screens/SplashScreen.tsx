import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import { useLanguage } from '../context/LanguageContext';
import { AppBranding } from '../components/AppBranding';

export const SplashScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  return (
  <View style={[styles.container, { backgroundColor: colors.primary }]}>
    <View style={{ paddingTop: insets.top }} />
    <View style={styles.titleBar}>
      <AppBranding
        title={t('appName')}
        subtitle={t('splashSubtitle')}
        tone="onBrand"
        logoSize={112}
      />
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
    paddingVertical: 20,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 32
  },
  spinner: {}
});
