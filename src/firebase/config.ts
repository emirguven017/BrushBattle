import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { initializeAuth, getReactNativePersistence, getAuth, Auth } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCH3NxUe-rpLGfh5Aw1xoY95DWRb3mxskk',
  authDomain: 'disapp-77fa7.firebaseapp.com',
  projectId: 'disapp-77fa7',
  storageBucket: 'disapp-77fa7.firebasestorage.app',
  messagingSenderId: '239771690652',
  appId: '1:239771690652:web:94a09a553473acfc8faf59',
  measurementId: 'G-TT5H4CHVR2'
};

let app: FirebaseApp;
let auth: Auth;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
} else {
  app = getApps()[0] as FirebaseApp;
  auth = getAuth(app);
}
export { auth };
export const db: Firestore = getFirestore(app);
