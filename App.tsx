import React from 'react';
import { Text, Alert, Linking as RNLinking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoLinking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { useAuth } from './src/hooks/useAuth';
import { SplashScreen } from './src/screens/SplashScreen';
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

const tabBarStyle = {
  backgroundColor: colors.card,
  borderTopWidth: 1,
  borderTopColor: colors.cardBorder,
  paddingTop: 8,
  height: 60
};

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarLabel: t('home'),
          tabBarIcon: () => <Text>🏠</Text>
        }}
      />
      <Tab.Screen
        name="Group"
        component={GroupScreen}
        options={{
          tabBarLabel: t('group'),
          tabBarIcon: () => <Text>👥</Text>
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: t('score'),
          tabBarIcon: () => <Text>🏆</Text>
        }}
      />
      <Tab.Screen
        name="BRMarket"
        component={BRMarketScreen}
        options={{
          tabBarLabel: t('market'),
          tabBarIcon: () => <Text>🛒</Text>
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t('history'),
          tabBarIcon: () => <Text>📅</Text>
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings'),
          tabBarIcon: () => <Text>⚙️</Text>
        }}
      />
    </Tab.Navigator>
  );
};

const RootNavigatorInner: React.FC = () => {
  const { user, loading, refreshUser } = useAuth();

  const joinFromCode = React.useCallback(async (code: string) => {
    if (!code?.trim()) return;
    if (!user) {
      await AsyncStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase());
      return;
    }
    try {
      await GroupService.joinGroup(user.id, code);
      await refreshUser();
      Alert.alert('✅', 'Gruba otomatik katıldın.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Gruba katılınamadı';
      Alert.alert('Davet Hatası', msg);
    } finally {
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
    }
  }, [user, refreshUser]);

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

  if (loading) {
    return <SplashScreen />;
  }

  const needsOnboarding = user && !user.onboardingComplete;

  if (loading) {
    return <SplashScreen />;
  }
  if (user && needsOnboarding) {
    return <OnboardingScreen />;
  }
  if (user) {
    return <AppTabs />;
  }
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
    </Stack.Navigator>
  );
};

const RootNavigator: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <LanguageProvider>
    <AuthProvider>
      <NavigationContainer>
        <RootNavigatorInner />
      </NavigationContainer>
    </AuthProvider>
    </LanguageProvider>
    </GestureHandlerRootView>
  );
};

export default RootNavigator;


