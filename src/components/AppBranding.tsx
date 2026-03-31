import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { colors, headerTitle } from '../utils/colors';

const LOGO = require('../../assets/images/app-logo.png');

export type AppBrandingTone = 'onBrand' | 'onLight';

interface AppBrandingProps {
  title: string;
  subtitle?: string;
  tone: AppBrandingTone;
  logoSize?: number;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

export const AppBranding: React.FC<AppBrandingProps> = ({
  title,
  subtitle,
  tone,
  logoSize = 92,
  compact = false,
  style,
  titleStyle,
}) => {
  const onBrand = tone === 'onBrand';
  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.logoFrame, onBrand ? styles.logoFrameOnBrand : styles.logoFrameOnLight]}>
        <Image
          source={LOGO}
          style={{ width: compact ? Math.round(logoSize * 0.82) : logoSize, height: compact ? Math.round(logoSize * 0.82) : logoSize }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <Text
        style={[
          styles.title,
          onBrand ? styles.titleOnBrand : styles.titleOnLight,
          compact && styles.titleCompact,
          titleStyle,
        ]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, onBrand ? styles.subOnBrand : styles.subOnLight]}>{subtitle}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  logoFrame: {
    borderRadius: 999,
    padding: 6,
  },
  logoFrameOnBrand: {
    backgroundColor: '#FFFFFF10',
  },
  logoFrameOnLight: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  title: {
    ...headerTitle,
    marginTop: 8,
    textAlign: 'center',
  },
  titleCompact: {
    marginTop: 5,
  },
  titleOnBrand: {
    color: colors.white,
  },
  titleOnLight: {
    color: colors.primary,
    fontSize: 20,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  subOnBrand: {
    color: colors.white,
    opacity: 0.9,
  },
  subOnLight: {
    color: colors.textSecondary,
    lineHeight: 21,
  },
});
