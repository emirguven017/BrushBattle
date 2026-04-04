import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { type Colors, lightColors } from './colors';

export const isIosUi = Platform.OS === 'ios';

export const createIosStyles = (colors: Colors) => ({
  iosGroupedBg: colors.iosGroupedBg,
  iosScreenTitleText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.6,
    textAlign: 'center',
  } as TextStyle,
  iosSectionLabelText: {
    fontSize: 13,
    fontWeight: '400',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: -0.08,
  } as TextStyle,
  iosGroupedCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  } as ViewStyle,
});

/** @deprecated — useThemedStyles(createIosStyles) kullan */
const _legacy = createIosStyles(lightColors);
export const IOS_GROUPED_BG = _legacy.iosGroupedBg;
export const iosScreenTitleText = _legacy.iosScreenTitleText;
export const iosSectionLabelText = _legacy.iosSectionLabelText;
export const iosGroupedCard = _legacy.iosGroupedCard;
