import { StyleSheet } from 'react-native';
import { colors, ui } from './colors';

export const uiStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: ui.screenPadding,
    paddingBottom: ui.spacingXl,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    borderRadius: ui.radiusLg,
    padding: ui.cardPadding,
  },
  sectionTitle: {
    fontSize: ui.titleMd,
    fontWeight: '800',
    color: colors.text,
    marginBottom: ui.spacingSm,
  },
  helperText: {
    fontSize: ui.textSm,
    color: colors.muted,
  },
  input: {
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    borderRadius: ui.radiusMd,
    backgroundColor: colors.white,
    paddingHorizontal: ui.spacingMd,
    paddingVertical: ui.spacingSm,
    color: colors.text,
    fontSize: ui.textMd,
  },
  buttonPrimary: {
    minHeight: ui.buttonHeight,
    borderRadius: ui.radiusMd,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ui.spacingLg,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: ui.textMd,
    fontWeight: '700',
  },
  buttonSecondary: {
    minHeight: ui.buttonHeight,
    borderRadius: ui.radiusMd,
    backgroundColor: colors.white,
    borderWidth: ui.borderWidth,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: ui.spacingLg,
  },
  buttonSecondaryText: {
    color: colors.primary,
    fontSize: ui.textMd,
    fontWeight: '700',
  },
  chip: {
    borderWidth: ui.borderWidth,
    borderColor: colors.cardBorder,
    borderRadius: 999,
    paddingHorizontal: ui.spacingSm,
    paddingVertical: ui.spacingXs,
    backgroundColor: colors.white,
  },
});

