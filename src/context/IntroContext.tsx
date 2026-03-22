import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const HAS_SEEN_INTRO_KEY = '@brush_battle_has_seen_intro';
const introKeyForUser = (userId: string) => `@brush_battle_intro_user_${userId}`;

interface IntroContextType {
  hasSeenIntro: boolean | null;
  hasSeenIntroForNewUser: boolean | null;
  showIntroOverlay: boolean;
  refreshIntroStatus: () => Promise<void>;
  refreshNewUserIntroStatus: (userId: string) => Promise<void>;
  resetIntro: () => Promise<void>;
  requestShowIntroAgain: () => Promise<void>;
  dismissIntroOverlay: () => void;
  markIntroComplete: () => Promise<void>;
  markNewUserIntroComplete: (userId: string) => Promise<void>;
}

const IntroContext = createContext<IntroContextType | null>(null);

export const IntroProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasSeenIntro, setHasSeenIntro] = useState<boolean | null>(false);
  const [hasSeenIntroForNewUser, setHasSeenIntroForNewUser] = useState<boolean | null>(null);
  const [showIntroOverlay, setShowIntroOverlay] = useState(false);

  const refreshIntroStatus = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem(HAS_SEEN_INTRO_KEY);
      setHasSeenIntro(val === 'true');
    } catch {
      setHasSeenIntro(false);
    }
  }, []);

  const refreshNewUserIntroStatus = useCallback(async (userId: string) => {
    try {
      const val = await AsyncStorage.getItem(introKeyForUser(userId));
      setHasSeenIntroForNewUser(val === 'true');
    } catch {
      setHasSeenIntroForNewUser(false);
    }
  }, []);

  const resetIntro = useCallback(async () => {
    await AsyncStorage.removeItem(HAS_SEEN_INTRO_KEY);
    setHasSeenIntro(false);
  }, []);

  const requestShowIntroAgain = useCallback(async () => {
    await AsyncStorage.removeItem(HAS_SEEN_INTRO_KEY);
    setHasSeenIntro(false);
    setShowIntroOverlay(true);
  }, []);

  const dismissIntroOverlay = useCallback(() => {
    setShowIntroOverlay(false);
  }, []);

  const markIntroComplete = useCallback(async () => {
    await AsyncStorage.setItem(HAS_SEEN_INTRO_KEY, 'true');
    setHasSeenIntro(true);
  }, []);

  const markNewUserIntroComplete = useCallback(async (userId: string) => {
    await AsyncStorage.setItem(introKeyForUser(userId), 'true');
    setHasSeenIntroForNewUser(true);
  }, []);

  React.useEffect(() => {
    refreshIntroStatus();
  }, [refreshIntroStatus]);

  return (
    <IntroContext.Provider
      value={{
        hasSeenIntro,
        hasSeenIntroForNewUser,
        showIntroOverlay,
        refreshIntroStatus,
        refreshNewUserIntroStatus,
        resetIntro,
        requestShowIntroAgain,
        dismissIntroOverlay,
        markIntroComplete,
        markNewUserIntroComplete
      }}
    >
      {children}
    </IntroContext.Provider>
  );
};

export const useIntro = () => {
  const ctx = useContext(IntroContext);
  if (!ctx) throw new Error('useIntro must be used within IntroProvider');
  return ctx;
};
