import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../utils/colors';
import { AppBranding } from '../components/AppBranding';
import { useLanguage } from '../context/LanguageContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  { kind: 'ion', icon: 'cart', titleKey: 'introSlide4Title', descKey: 'introSlide4Desc' }
];

interface IntroScreenProps {
  onComplete: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const { t, language, setLanguage } = useLanguage();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const newPage = Math.round(offsetX / SCREEN_WIDTH);
    if (newPage !== page) setPage(newPage);
  };

  const handleNext = () => {
    if (page < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: (page + 1) * SCREEN_WIDTH,
        animated: true
      });
    } else {
      onComplete();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <View style={styles.headerCenter}>
          <AppBranding
            title={t('appName')}
            tone="onLight"
            logoSize={50}
            compact
            titleStyle={{ fontSize: 17, marginTop: 6, fontWeight: '800' }}
          />
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
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        onScroll={(e) => {
          const x = e.nativeEvent.contentOffset.x;
          const newPage = Math.round(x / SCREEN_WIDTH);
          if (newPage >= 0 && newPage < SLIDES.length && newPage !== page) setPage(newPage);
        }}
        scrollEventThrottle={16}
        bounces={false}
      >
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.slide, { width: SCREEN_WIDTH }]}>
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
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.85}>
          <Text style={styles.btnText}>
            {page === SLIDES.length - 1 ? t('introStartBtn') : t('introNextBtn')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20
  },
  headerSpacer: {
    width: 44
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8
  },
  langBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.primary
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary
  },
  scrollView: {
    flex: 1
  },
  slide: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emojiWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18
  },
  slideLogo: {
    width: 62,
    height: 62,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12
  },
  desc: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 16
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 4
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center'
  },
  btnText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800'
  }
});
