import React from 'react';
import { Linking as RNLinking, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { DefaultTheme, NavigationContainer, NavigationIndependentTree } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { IntroProvider, useIntro } from './src/context/IntroContext';
import { useAuth } from './src/hooks/useAuth';
import { SplashScreen } from './src/screens/SplashScreen';
import { IntroScreen } from './src/screens/IntroScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { BrushingTimerScreen } from './src/screens/BrushingTimerScreen';
import { BrushingMenuScreen } from './src/screens/BrushingMenuScreen';
import { GroupScreen } from './src/screens/GroupScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BRMarketScreen } from './src/screens/BRMarketScreen';
import { UseFeatureScreen } from './src/screens/UseFeatureScreen';
import { colors, headerTitle } from './src/utils/colors';
import { GroupService } from './src/services/GroupService';
import { NotificationService } from './src/services/NotificationService';
import { NotificationInboxService } from './src/services/notificationInboxService';
import {
  FIRST_RUN_LANGUAGE_DONE_KEY,
  WELCOME_WIZARD_DONE_KEY,
  WELCOME_WIZARD_DATA_KEY,
  firstRunLanguageAccountDoneKey,
  welcomeWizardAccountDoneKey,
} from './src/constants/welcomeWizard';
import { WelcomeWizardScreen } from './src/screens/WelcomeWizardScreen';
import { LanguagePickFirstScreen } from './src/screens/LanguagePickFirstScreen';
import { AppFeedbackModal } from './src/components/AppFeedbackModal';

const Stack = createNativeStackNavigator();
const PENDING_INVITE_KEY = '@brush_battle_pending_invite_code';


const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleAlign: 'center' as const,
  contentStyle: { backgroundColor: colors.background },
  headerTitleStyle: {
    fontSize: headerTitle.fontSize,
    fontWeight: headerTitle.fontWeight
  }
};

const HomeStack: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: t('homeHeaderTitle') }}
      />
      <Stack.Screen
        name="BrushingTimer"
        component={BrushingTimerScreen}
        options={{ title: t('brushingTime') }}
      />
    </Stack.Navigator>
  );
};

const BrushingStack: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="BrushingMenuMain"
        component={BrushingMenuScreen}
        options={{ title: t('brushingMenu') }}
      />
      <Stack.Screen
        name="BrushingTimer"
        component={BrushingTimerScreen}
        options={{ title: t('brushingTime') }}
      />
    </Stack.Navigator>
  );
};

const LeaderboardStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LeaderboardMain" component={LeaderboardScreen} />
      <Stack.Screen name="UseFeature" component={UseFeatureScreen} />
    </Stack.Navigator>
  );
};

const GroupStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupMain" component={GroupScreen} />
    </Stack.Navigator>
  );
};

const BRMarketStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BRMarketMain" component={BRMarketScreen} />
    </Stack.Navigator>
  );
};

const HistoryStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryMain" component={HistoryScreen} />
    </Stack.Navigator>
  );
};

const SettingsStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
    </Stack.Navigator>
  );
};

const AppTabs: React.FC = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = React.useState(0);
  const translateX = useSharedValue(0);

  const tabs = React.useMemo(
    () => [
      { key: 'Home', label: t('home'), render: () => <HomeStack />, icon: (focused: boolean) => <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={focused ? colors.primary : colors.muted} /> },
      { key: 'Group', label: t('group'), render: () => <GroupStack />, icon: (focused: boolean) => <Ionicons name={focused ? 'people' : 'people-outline'} size={22} color={focused ? colors.primary : colors.muted} /> },
      { key: 'Leaderboard', label: t('score'), render: () => <LeaderboardStack />, icon: (focused: boolean) => <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={22} color={focused ? colors.primary : colors.muted} /> },
      {
        key: 'BrushingMenu',
        label: t('brushingMenu'),
        render: () => <BrushingStack />,
        icon: (focused: boolean) => (
          <View style={[styles.brushFab, { borderColor: focused ? colors.primary : colors.cardBorder }]}>
            <MaterialCommunityIcons name="toothbrush" size={32} color={colors.primary} />
          </View>
        ),
      },
      { key: 'BRMarket', label: t('market'), render: () => <BRMarketStack />, icon: (focused: boolean) => <Ionicons name={focused ? 'cart' : 'cart-outline'} size={22} color={focused ? colors.primary : colors.muted} /> },
      { key: 'History', label: t('history'), render: () => <HistoryStack />, icon: (focused: boolean) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={focused ? colors.primary : colors.muted} /> },
      { key: 'Settings', label: t('settings'), render: () => <SettingsStack />, icon: (focused: boolean) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={22} color={focused ? colors.primary : colors.muted} /> },
    ],
    [t]
  );

  React.useEffect(() => {
    translateX.value = -activeIndex * width;
  }, [activeIndex, width, translateX]);

  const jumpTo = React.useCallback((index: number) => {
    if (index < 0 || index >= tabs.length) return;
    setActiveIndex(index);
    translateX.value = withTiming(-index * width, { duration: 220 });
  }, [tabs.length, translateX, width]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const minX = -(tabs.length - 1) * width;
      const nextX = -activeIndex * width + e.translationX;
      translateX.value = Math.max(minX, Math.min(0, nextX));
    })
    .onEnd((e) => {
      const threshold = width * 0.22;
      let nextIndex = activeIndex;
      if (e.translationX < -threshold && activeIndex < tabs.length - 1) nextIndex = activeIndex + 1;
      if (e.translationX > threshold && activeIndex > 0) nextIndex = activeIndex - 1;
      runOnJS(setActiveIndex)(nextIndex);
      translateX.value = withTiming(-nextIndex * width, { duration: 220 });
    });

  const pagerStyle = useAnimatedStyle(() => ({
    width: width * tabs.length,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GestureDetector gesture={panGesture}>
        <View style={{ flex: 1, overflow: 'hidden' }}>
          <Animated.View style={[{ flexDirection: 'row', flex: 1 }, pagerStyle]}>
            {tabs.map((tab) => (
              <View key={tab.key} style={{ width, flex: 1 }}>
                <NavigationIndependentTree>
                  <NavigationContainer theme={DefaultTheme}>
                    {tab.render()}
                  </NavigationContainer>
                </NavigationIndependentTree>
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>

      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            height: 56 + Math.max(insets.bottom, 8),
          },
        ]}
      >
        {tabs.map((tab, index) => {
          const focused = activeIndex === index;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.9}
              style={styles.tabButton}
              onPress={() => jumpTo(index)}
            >
              {tab.icon(focused)}
              <Text
                style={[
                  styles.tabLabel,
                  { color: focused ? colors.primary : colors.muted },
                  tab.key === 'BrushingMenu' ? styles.brushLabel : undefined,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const RootNavigatorInner: React.FC = () => {
  const { t } = useLanguage();
  const { user, loading, refreshUser } = useAuth();
  const [welcomeWizardDone, setWelcomeWizardDone] = React.useState<boolean | null>(null);
  const [firstRunLanguageDone, setFirstRunLanguageDone] = React.useState<boolean | null>(null);
  const [accountLanguageResolved, setAccountLanguageResolved] = React.useState<boolean | null>(null);
  const [accountWizardResolved, setAccountWizardResolved] = React.useState<boolean | null>(null);
  const [feedbackModal, setFeedbackModal] = React.useState<{ title: string; message: string } | null>(null);

  React.useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(WELCOME_WIZARD_DONE_KEY),
      AsyncStorage.getItem(FIRST_RUN_LANGUAGE_DONE_KEY),
    ])
      .then(([wizard, lang]) => {
        setWelcomeWizardDone(wizard === 'true');
        setFirstRunLanguageDone(lang === 'true');
      })
      .catch(() => {
        setWelcomeWizardDone(false);
        setFirstRunLanguageDone(false);
      });
  }, []);

  const {
    hasSeenIntroForNewUser,
    showIntroOverlay,
    refreshNewUserIntroStatus,
    markNewUserIntroComplete,
    dismissIntroOverlay,
    clearNewUserIntroOnLogout,
  } = useIntro();

  React.useEffect(() => {
    if (!user) {
      clearNewUserIntroOnLogout();
    }
  }, [user, clearNewUserIntroOnLogout]);

  React.useEffect(() => {
    if (user?.id && !user?.onboardingComplete) {
      refreshNewUserIntroStatus(user.id);
    }
  }, [user?.id, user?.onboardingComplete, refreshNewUserIntroStatus]);

  React.useEffect(() => {
    if (!user?.id || user.onboardingComplete) {
      setAccountLanguageResolved(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(firstRunLanguageAccountDoneKey(user.id));
        if (!cancelled) setAccountLanguageResolved(done === 'true');
      } catch {
        if (!cancelled) setAccountLanguageResolved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.onboardingComplete]);

  React.useEffect(() => {
    if (!user?.id || user.onboardingComplete) {
      setAccountWizardResolved(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const accountKey = welcomeWizardAccountDoneKey(user.id);
        const accDone = await AsyncStorage.getItem(accountKey);
        if (cancelled) return;
        if (accDone === 'true') {
          setAccountWizardResolved(true);
          return;
        }
        const deviceDone = await AsyncStorage.getItem(WELCOME_WIZARD_DONE_KEY);
        const data = await AsyncStorage.getItem(WELCOME_WIZARD_DATA_KEY);
        if (cancelled) return;
        if (deviceDone === 'true' && data) {
          await AsyncStorage.setItem(accountKey, 'true');
          setAccountWizardResolved(true);
          return;
        }
        setAccountWizardResolved(false);
      } catch {
        if (!cancelled) setAccountWizardResolved(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.onboardingComplete]);

  const joinFromCode = React.useCallback(async (code: string) => {
    if (!code?.trim()) return;
    if (!user) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
      return;
    }
    try {
      await GroupService.joinGroup(user.id, code);
      await refreshUser();
      setFeedbackModal({ title: t('info'), message: t('joinedGroupSuccess') });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('joinGroupFailed');
      setFeedbackModal({ title: t('inviteError'), message: msg });
    } finally {
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    }
  }, [user, refreshUser, t]);

  React.useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;
      const parsed = ExpoLinking.parse(url);
      const path = parsed.path?.replace(/^\/+/, '');
      const codeParam = parsed.queryParams?.code;
      const code = typeof codeParam === 'string' ? codeParam : undefined;
      if (path === 'join' && code) {
        await joinFromCode(code);
      }
    };

    ExpoLinking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = RNLinking.addEventListener('url', ({ url }) => {
      handleUrl(url).catch(() => {});
    });

    return () => sub.remove();
  }, [joinFromCode]);

  React.useEffect(() => {
    if (!user) return;
    AsyncStorage.getItem(PENDING_INVITE_KEY)
      .then((code) => {
        if (code) return joinFromCode(code);
      })
      .catch(() => {});
  }, [user?.id, joinFromCode]);

  React.useEffect(() => {
    if (!user) return;
    NotificationService.syncDailyBaseReminders(user).catch(() => {});
  }, [user?.id, user?.dailySessionCount, user?.morningTime, user?.middayTime, user?.eveningTime]);

  React.useEffect(() => {
    if (!user?.id) return;
    return NotificationInboxService.subscribeInbox(user.id);
  }, [user?.id]);

  const needsOnboarding = Boolean(user && !user.onboardingComplete);
  const needsNewUserIntro = needsOnboarding && hasSeenIntroForNewUser !== true;

  if (showIntroOverlay && user) {
    return <IntroScreen onComplete={dismissIntroOverlay} />;
  }

  if (user && needsOnboarding) {
    if (accountLanguageResolved === null) {
      return <SplashScreen />;
    }
    if (accountLanguageResolved === false) {
      return (
        <LanguagePickFirstScreen
          mode="account"
          userId={user.id}
          onComplete={() => setAccountLanguageResolved(true)}
        />
      );
    }
    if (accountWizardResolved === null) {
      return <SplashScreen />;
    }
    if (accountWizardResolved === false) {
      return (
        <WelcomeWizardScreen
          mode="account"
          userId={user.id}
          onComplete={() => setAccountWizardResolved(true)}
        />
      );
    }
    if (hasSeenIntroForNewUser === null) {
      return <SplashScreen />;
    }
    if (needsNewUserIntro) {
      return (
        <IntroScreen
          onComplete={() => user.id && markNewUserIntroComplete(user.id)}
        />
      );
    }
    return <OnboardingScreen />;
  }

  if (user) {
    return <AppTabs />;
  }
  if (loading || welcomeWizardDone === null || firstRunLanguageDone === null) {
    return <SplashScreen />;
  }
  if (!welcomeWizardDone) {
    if (!firstRunLanguageDone) {
      return (
        <LanguagePickFirstScreen onComplete={() => setFirstRunLanguageDone(true)} />
      );
    }
    return <WelcomeWizardScreen onComplete={() => setWelcomeWizardDone(true)} />;
  }
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
      <AppFeedbackModal
        visible={feedbackModal !== null}
        title={feedbackModal?.title ?? ''}
        message={feedbackModal?.message ?? ''}
        buttonText={t('ok')}
        onClose={() => setFeedbackModal(null)}
      />
    </>
  );
};

const RootNavigator: React.FC = () => {
  const appTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.cardBorder,
      notification: colors.error,
    },
  };

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
    <LanguageProvider>
    <IntroProvider>
    <AuthProvider>
      <NavigationContainer theme={appTheme}>
        <RootNavigatorInner />
      </NavigationContainer>
    </AuthProvider>
    </IntroProvider>
    </LanguageProvider>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
};

export default RootNavigator;

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingTop: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  brushFab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginTop: -22,
    backgroundColor: colors.white,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brushLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});


