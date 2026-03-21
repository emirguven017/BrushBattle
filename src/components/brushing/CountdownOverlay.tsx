import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLanguage } from '../../context/LanguageContext';
import * as Haptics from 'expo-haptics';

interface CountdownOverlayProps {
  visible: boolean;
  number: 3 | 2 | 1;
  onComplete?: () => void;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  visible,
  number,
}) => {
  const { t } = useLanguage();
  useEffect(() => {
    if (visible) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (_) {}
    }
  }, [visible, number]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Text style={styles.number}>{number}</Text>
      <Text style={styles.subtitle}>{t('readyNextZone')}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  number: {
    fontSize: 120,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 24,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
