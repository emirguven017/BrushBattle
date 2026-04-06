import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';

export type AppWordmarkVariant = 'login' | 'nav';

interface AppWordmarkProps {
  /** `t('appName')` — boşluktan bölünür: ilk kelime marka rengi */
  name: string;
  variant?: AppWordmarkVariant;
  style?: StyleProp<ViewStyle>;
}

/**
 * Uygulama adı: ilk kelime yeşil marka, geri kalan koyu metin — düz tek satırdan daha okunaklı.
 */
export const AppWordmark: React.FC<AppWordmarkProps> = ({
  name,
  variant = 'login',
  style,
}) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const spaceIdx = name.indexOf(' ');
  const first = spaceIdx >= 0 ? name.slice(0, spaceIdx) : name;
  const rest = spaceIdx >= 0 ? name.slice(spaceIdx) : '';
  const isNav = variant === 'nav';

  return (
    <View style={[styles.row, style]} accessibilityRole="header">
      <Text style={isNav ? styles.brushNav : styles.brushLogin}>{first}</Text>
      {rest ? <Text style={isNav ? styles.timerNav : styles.timerLogin}>{rest}</Text> : null}
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'nowrap',
  },
  brushNav: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: -0.35,
  },
  timerNav: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
    letterSpacing: -0.35,
  },
  brushLogin: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: -0.65,
  },
  timerLogin: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111111',
    letterSpacing: -0.65,
  },
});
