import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type Colors } from '../utils/colors';
import { AppWordmark } from '../components/AppWordmark';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';
import { useLanguage } from '../context/LanguageContext';
import { useColors } from '../context/ThemeContext';

const { width: SCREEN_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const H_PADDING = 18;
const SLIDE_WIDTH = SCREEN_WIDTH - H_PADDING * 2;
/** Beyaz kartı küçültür; etrafında daha fazla yeşil alan kalır */
const CARD_HEIGHT = Math.round(WINDOW_HEIGHT * 0.74);

const APP_LOGO = require('../../assets/images/app-logo.png');

type IntroSlide =
  | { kind: 'logo'; titleKey: string; descKey: string }
  | {
      kind: 'ion';
      icon: keyof typeof Ionicons.glyphMap;
      titleKey: string;
      descKey: string;
    };

const SLIDES: IntroSlide[] = [
  { kind: 'logo', titleKey: 'introSlide1Title', descKey: 'introSlide1Desc' },
  { kind: 'ion', icon: 'calendar', titleKey: 'introSlide2Title', descKey: 'introSlide2Desc' },
  { kind: 'ion', icon: 'people', titleKey: 'introSlide3Title', descKey: 'introSlide3Desc' },
  { kind: 'ion', icon: 'cart', titleKey: 'introSlide4Title', descKey: 'introSlide4Desc' },
];

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useLanguage();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newPage = Math.round(offsetX / SLIDE_WIDTH);
    if (newPage !== page) setPage(newPage);
  };

  const handleNext = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (page + 1) * SLIDE_WIDTH,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  return (
    <BrandedScreenBackground>
      <View
        style={[
          styles.outer,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 },
        ]}
      >
        <View style={[styles.contentCard, { height: CARD_HEIGHT }]}>
          <View style={styles.header}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerBrand}>
              <AppWordmark name={t('appName')} variant="login" style={styles.wordmark} />
            </View>
            <TouchableOpacity
              style={styles.langBtn}
              onPress={() => setLanguage(language === 'tr' ? 'en' : 'tr')}
              activeOpacity={0.7}
            >
              <Text style={styles.langBtnText}>{language === 'tr' ? 'TR' : 'EN'}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleScroll}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const newPage = Math.round(x / SLIDE_WIDTH);
              if (newPage >= 0 && newPage < SLIDES.length && newPage !== page) setPage(newPage);
            }}
            scrollEventThrottle={16}
            bounces={false}
          >
            {SLIDES.map((slide, i) => (
              <View key={i} style={[styles.slide, { width: SLIDE_WIDTH }]}>
                <View style={styles.emojiWrap}>
                  {slide.kind === 'logo' ? (
                    <Image source={APP_LOGO} style={styles.slideLogo} resizeMode="contain" />
                  ) : (
                    <Ionicons name={slide.icon} size={56} color={colors.primary} />
                  )}
                </View>
                <Text style={styles.title}>{t(slide.titleKey)}</Text>
                <Text style={styles.desc}>{t(slide.descKey)}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
              ))}
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
              <Text style={styles.btnText}>
                {page === SLIDES.length - 1 ? t('introStartBtn') : t('introNextBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    outer: {
      flex: 1,
      paddingHorizontal: H_PADDING,
      justifyContent: 'center',
    },
    contentCard: {
      backgroundColor: colors.white,
      borderRadius: 24,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 6,
    },
    headerSpacer: {
      width: 52,
    },
    headerBrand: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    wordmark: {
      marginTop: 0,
    },
    langBtn: {
      width: 52,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: '#F4F6F7',
      borderWidth: 1,
      borderColor: colors.primary + '88',
      alignItems: 'center',
    },
    langBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: colors.primaryDark,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    slide: {
      flex: 1,
      paddingHorizontal: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emojiWrap: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#F4F6F7',
      borderWidth: 1,
      borderColor: '#E7ECEA',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 18,
    },
    slideLogo: {
      width: 72,
      height: 72,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: '#111111',
      textAlign: 'center',
      marginBottom: 12,
    },
    desc: {
      fontSize: 15,
      color: '#4A5F5E',
      textAlign: 'center',
      lineHeight: 22,
      fontWeight: '500',
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 16,
      paddingTop: 6,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: 16,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#E0E6E4',
      marginHorizontal: 4,
    },
    dotActive: {
      backgroundColor: colors.primary,
      width: 24,
    },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      ...Platform.select({
        ios: {
          shadowColor: colors.primaryDark,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.24,
          shadowRadius: 14,
        },
        android: {
          elevation: 4,
        },
        default: {},
      }),
    },
    btnText: {
      color: colors.white,
      fontSize: 17,
      fontWeight: '800',
    },
  });
