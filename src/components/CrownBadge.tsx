import React, { useMemo } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

interface CrownBadgeProps {
  visible?: boolean;
  label?: string;
}

export const CrownBadge: React.FC<CrownBadgeProps> = ({ visible = true, label }) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  const displayLabel = label ?? t('weeklyChampion');
  if (!visible) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>👑 {displayLabel}</Text>
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7DA',
    borderColor: '#F2C94C',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
