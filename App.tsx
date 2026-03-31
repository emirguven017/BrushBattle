import React from 'react';
import { Linking as RNLinking, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
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
const Tab = createBottomTabNavigator();
const PENDING_INVITE_KEY = '@brush_battle_pending_invite_code';


const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleAlign: 'center' as const,
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

const AppTabs: React.FC = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 56 + Math.max(insets.bottom, 8)
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Group"
        component={GroupScreen}
        options={{
          tabBarLabel: t('group'),
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardStack}
        listeners={({ navigation }) => ({
          tabPress: () => {
            (navigation as { navigate: (name: string, params?: object) => void }).navigate('Leaderboard', {
              screen: 'LeaderboardMain',
            });
          },
        })}
        options={{
          tabBarLabel: t('score'),
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="BrushingMenu"
        component={BrushingStack}
        options={{
          tabBarLabel: t('brushingMenu'),
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 31,
                marginTop: -22,
                backgroundColor: colors.white,
                borderWidth: 5,
                borderColor: focused ? colors.primary : colors.cardBorder,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="toothbrush" size={32} color={colors.primary} />
            </View>
          ),
          tabBarButton: (props) => (
            <TouchableOpacity
              {...props}
              activeOpacity={0.9}
              style={[props.style, { justifyContent: 'center', alignItems: 'center' }]}
            />
          ),
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginTop: 4 },
        }}
      />
      <Tab.Screen
        name="BRMarket"
        component={BRMarketScreen}
        options={{
          tabBarLabel: t('market'),
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'cart' : 'cart-outline'} size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t('history'),
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'settings' : 'settings-outline'} size={size} color={color} />
        }}
      />
    </Tab.Navigator>
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
  return (
    <SafeAreaProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <LanguageProvider>
    <IntroProvider>
    <AuthProvider>
      <NavigationContainer>
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


