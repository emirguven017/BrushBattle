import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import CountryFlag from 'react-native-country-flag';
import { type Colors } from '../utils/colors';
import { AppBranding } from '../components/AppBranding';
import { AppWordmark } from '../components/AppWordmark';
import { useLanguage } from '../context/LanguageContext';
import { useColors } from '../context/ThemeContext';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';
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

const FLAG_SIZE = 32;

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
    <BrandedScreenBackground>
    <View style={[styles.root, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.contentCard}>
        <View style={styles.headerBlock}>
          <AppBranding title="" tone="onLight" logoSize={96} showLogoFrame={false} style={styles.branding} />
          <AppWordmark name={t('appName')} variant="login" style={styles.wordmark} />
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
            <View style={styles.flagWrap}>
              <CountryFlag isoCode="tr" size={FLAG_SIZE} style={styles.flag} />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.cardTitle}>{t('langPickTurkish')}</Text>
              <Text style={styles.cardHint}>{t('langPickHintTurkish')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.primaryDark} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, styles.cardAccent]}
            onPress={() => handlePick('en')}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={t('langPickEnglish')}
          >
            <View style={styles.flagWrap}>
              <CountryFlag isoCode="gb" size={FLAG_SIZE} style={styles.flag} />
            </View>
            <View style={styles.cardTextCol}>
              <Text style={styles.cardTitle}>{t('langPickEnglish')}</Text>
              <Text style={styles.cardHint}>{t('langPickHintEnglish')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  contentCard: {
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
      default: {},
    }),
  },
  headerBlock: {
    marginTop: 2,
    marginBottom: 18,
    alignItems: 'center',
  },
  branding: {
    marginBottom: 6,
  },
  wordmark: {
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111111',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#4A5F5E',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  cards: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6F7',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E7ECEA',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardPrimary: {
    borderColor: colors.primary + '55',
  },
  cardAccent: {
    borderColor: colors.accent + '55',
  },
  flagWrap: {
    marginRight: 14,
    justifyContent: 'center',
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
    fontSize: 18,
    fontWeight: '800',
    color: '#111111',
  },
  cardHint: {
    fontSize: 14,
    color: '#4A5F5E',
    marginTop: 4,
    lineHeight: 20,
    fontWeight: '500',
  },
});
