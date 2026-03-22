import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const REMEMBER_ME_EMAIL_KEY = '@brush_battle_remember_email';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  logIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const firebaseUserToAppUser = async (fbUser: FirebaseUser): Promise<User | null> => {
    try {
      const docRef = doc(db, 'users', fbUser.uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return { id: snap.id, ...snap.data() } as User;
      }
      return null;
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : '';
      if (msg.includes('offline')) {
        // Offline durumda auth state korunsun, uygulama crash etmesin.
        return null;
      }
      throw e;
    }
  };

  const ensureFirestoreUser = async (fbUser: FirebaseUser): Promise<User | null> => {
    const existing = await firebaseUserToAppUser(fbUser);
    if (existing) return existing;

    try {
      const email = fbUser.email ?? '';
      const usernameFallback = email ? email.split('@')[0] || 'User' : 'User';
      const base: Omit<User, 'id'> = {
        username: usernameFallback,
        email,
        points: 0,
        streak: 0,
        morningTime: '08:00',
        eveningTime: '21:00',
        onboardingComplete: false
      };
      const uid = fbUser.uid;
      await setDoc(doc(db, 'users', uid), { ...base, id: uid });
      await setDoc(doc(db, 'userBalances', uid), { userId: uid, brScore: 0 });
      await setDoc(doc(db, 'userInventory', uid), { userId: uid, items: {}, updatedAt: Date.now() });
      await setDoc(doc(db, 'userEffects', uid), { userId: uid, activeEffects: [], updatedAt: Date.now() });
      await setDoc(doc(db, 'userStats', uid), { userId: uid, totalWins: 0, badges: [] });
      return { id: uid, ...base };
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const fetchUser = async (fbUser: FirebaseUser) => {
      const appUser = await ensureFirestoreUser(fbUser);
      setUser(appUser);
    };
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        await fetchUser(fbUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signUp = async (email: string, password: string, username: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const base: Omit<User, 'id'> = {
      username,
      email,
      points: 0,
      streak: 0,
      morningTime: '08:00',
      eveningTime: '21:00',
      onboardingComplete: false
    };
    await setDoc(doc(db, 'users', cred.user.uid), { ...base, id: cred.user.uid });
    await setDoc(doc(db, 'userBalances', cred.user.uid), { userId: cred.user.uid, brScore: 0 });
    await setDoc(doc(db, 'userInventory', cred.user.uid), { userId: cred.user.uid, items: {}, updatedAt: Date.now() });
    await setDoc(doc(db, 'userEffects', cred.user.uid), { userId: cred.user.uid, activeEffects: [], updatedAt: Date.now() });
    await setDoc(doc(db, 'userStats', cred.user.uid), { userId: cred.user.uid, totalWins: 0, badges: [] });
    const appUser: User = { id: cred.user.uid, ...base };
    setUser(appUser);
  };

  const logIn = async (email: string, password: string, rememberMe = true) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const appUser = await ensureFirestoreUser(cred.user);
    if (!appUser) {
      await signOut(auth);
      const err = new Error('Profile creation failed');
      (err as Error & { code?: string }).code = 'auth/profile-creation-failed';
      throw err;
    }
    setUser(appUser);
    if (rememberMe) {
      await AsyncStorage.setItem(REMEMBER_ME_EMAIL_KEY, email);
    } else {
      await AsyncStorage.removeItem(REMEMBER_ME_EMAIL_KEY);
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const refreshUser = async () => {
    const fbUser = auth.currentUser;
    if (fbUser) await ensureFirestoreUser(fbUser).then((u) => u && setUser(u));
  };

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser, signUp, logIn, logOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
