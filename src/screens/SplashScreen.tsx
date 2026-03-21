import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../utils/colors';

export const SplashScreen: React.FC = () => (
  <View style={styles.container}>
    <View style={styles.titleBar}>
      <Text style={styles.title}>🪥 Brush Battle</Text>
      <Text style={styles.subtitle}>Diş fırçalama alışkanlığın</Text>
    </View>
    <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
