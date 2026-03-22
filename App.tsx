import React from 'react';
import { Alert, Linking as RNLinking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { GroupScreen } from './src/screens/GroupScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BRMarketScreen } from './src/screens/BRMarketScreen';
import { colors } from './src/utils/colors';
import { GroupService } from './src/services/GroupService';
import { NotificationService } from './src/services/NotificationService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const PENDING_INVITE_KEY = '@brush_battle_pending_invite_code';


const headerOptions = {
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: colors.white,
  headerTitleAlign: 'center' as const,
  headerTitleStyle: { fontWeight: '700', fontSize: 18 }
};

const HomeStack: React.FC = () => {
  const { t } = useLanguage();
  return (
    <Stack.Navigator screenOptions={headerOptions}>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: t('appName') }}
      />
      <Stack.Screen
        name="BrushingTimer"
        component={BrushingTimerScreen}
        options={{ title: t('brushingTime') }}
      />
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
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 12),
          height: 60 + Math.max(insets.bottom, 12)
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
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
        component={LeaderboardScreen}
        options={{
          tabBarLabel: t('score'),
          tabBarIcon: ({ focused, color, size }) => <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
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
  const {
    hasSeenIntroForNewUser,
    showIntroOverlay,
    refreshNewUserIntroStatus,
    markIntroComplete,
    markNewUserIntroComplete,
    dismissIntroOverlay
  } = useIntro();

  React.useEffect(() => {
    if (user?.id && !user?.onboardingComplete) {
      refreshNewUserIntroStatus(user.id);
    }
  }, [user?.id, user?.onboardingComplete, refreshNewUserIntroStatus]);

  const joinFromCode = React.useCallback(async (code: string) => {
    if (!code?.trim()) return;
    if (!user) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
      return;
    }
    try {
      await GroupService.joinGroup(user.id, code);
      await refreshUser();
      Alert.alert(t('joinedGroupSuccess'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('joinGroupFailed');
      Alert.alert(t('inviteError'), msg);
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
  }, [user?.id, user?.morningTime, user?.eveningTime]);

  const needsOnboarding = user && !user.onboardingComplete;
  const needsNewUserIntro = needsOnboarding && hasSeenIntroForNewUser !== true;

  if (showIntroOverlay && user) {
    return (
      <IntroScreen
        onComplete={dismissIntroOverlay}
      />
    );
  }
  if (user && needsOnboarding && !needsNewUserIntro) {
    return <OnboardingScreen />;
  }
  if (user && needsNewUserIntro) {
    return (
      <IntroScreen
        onComplete={() => user.id && markNewUserIntroComplete(user.id)}
      />
    );
  }
  if (user) {
    return <AppTabs />;
  }
  if (loading) {
    return <SplashScreen />;
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
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


