import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import { colors } from './colors';

/** iOS Ayarlar / sistem gruplanmış arka plan */
export const IOS_GROUPED_BG = '#F2F2F7';

export const isIosUi = Platform.OS === 'ios';

/** Yeşil üst şerit yerine kullanılan büyük ekran başlığı */
export const iosScreenTitleText: TextStyle = {
  fontSize: 28,
  fontWeight: '700',
  color: colors.text,
  letterSpacing: -0.6,
  textAlign: 'center',
};

export const iosSectionLabelText: TextStyle = {
  fontSize: 13,
  fontWeight: '400',
  color: colors.muted,
  textTransform: 'uppercase',
  letterSpacing: -0.08,
};

/** Ayarlar tarzı beyaz grup kartı */
export const iosGroupedCard: ViewStyle = {
  backgroundColor: colors.white,
  borderRadius: 10,
  borderWidth: StyleSheet.hairlineWidth,
  borderColor: 'rgba(60, 60, 67, 0.18)',
};
