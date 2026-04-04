import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { type Colors } from '../utils/colors';
import { AppBranding } from '../components/AppBranding';
import { useLanguage } from '../context/LanguageContext';
import { useColors } from '../context/ThemeContext';
import {
  FIRST_RUN_LANGUAGE_DONE_KEY,
  firstRunLanguageAccountDoneKey,
} from '../constants/welcomeWizard';
import type { Language } from '../i18n/translations';

interface LanguagePickFirstScreenProps {
  onComplete: () => void;
  mode?: 'device' | 'account';
  userId?: string;
}

const FLAG_SIZE = 28;

export const LanguagePickFirstScreen: React.FC<LanguagePickFirstScreenProps> = ({
  onComplete,
  mode = 'device',
  userId,
}) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t, setLanguage } = useLanguage();

  const handlePick = async (lang: Language) => {
    setLanguage(lang);
    if (mode === 'account' && userId) {
      await AsyncStorage.setItem(firstRunLanguageAccountDoneKey(userId), 'true');
    } else {
      await AsyncStorage.setItem(FIRST_RUN_LANGUAGE_DONE_KEY, 'true');
    }
    onComplete();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.headerBlock}>
        <AppBranding title={t('appName')} tone="onLight" logoSize={100} style={styles.branding} />
        <Text style={styles.title}>{t('langPickTitle')}</Text>
        <Text style={styles.subtitle}>{t('langPickSubtitle')}</Text>
      </View>

      <View style={styles.cards}>
        <TouchableOpacity
          style={[styles.card, styles.cardPrimary]}
          onPress={() => handlePick('tr')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={t('langPickTurkish')}
        >
          <View style={[styles.flagRing, styles.flagRingPrimary]}>
            <CountryFlag isoCode="tr" size={FLAG_SIZE} style={styles.flag} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardTitle}>{t('langPickTurkish')}</Text>
            <Text style={styles.cardHint}>{t('langPickHintTurkish')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.card, styles.cardAccent]}
          onPress={() => handlePick('en')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel={t('langPickEnglish')}
        >
          <View style={[styles.flagRing, styles.flagRingAccent]}>
            <CountryFlag isoCode="gb" size={FLAG_SIZE} style={styles.flag} />
          </View>
          <View style={styles.cardTextCol}>
            <Text style={styles.cardTitle}>{t('langPickEnglish')}</Text>
            <Text style={styles.cardHint}>{t('langPickHintEnglish')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 22,
    justifyContent: 'flex-start',
  },
  headerBlock: {
    marginTop: 6,
    marginBottom: 16,
    alignItems: 'center',
  },
  branding: {
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  cards: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardPrimary: {
    borderColor: colors.primary + '55',
    backgroundColor: colors.white,
  },
  cardAccent: {
    borderColor: colors.accent + '55',
    backgroundColor: colors.white,
  },
  flagRing: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  flagRingPrimary: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.primary + '33',
  },
  flagRingAccent: {
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent + '33',
  },
  flag: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  cardHint: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
    lineHeight: 18,
  },
});
