import { NativeModules, Platform } from 'react-native';

type DynamicIslandNativeModule = {
  startBrushingActivity: (title: string, subtitle: string, minutes: number) => Promise<void>;
  endBrushingActivity: () => Promise<void>;
};

const nativeModule = NativeModules.DynamicIslandModule as DynamicIslandNativeModule | undefined;

const isSupported = Platform.OS === 'ios' && typeof nativeModule?.startBrushingActivity === 'function';

export const DynamicIslandService = {
  async startBrushingSession(title: string, subtitle: string, minutes: number): Promise<void> {
    if (!isSupported || !nativeModule) return;
    try {
      await nativeModule.startBrushingActivity(title, subtitle, minutes);
    } catch {
      // Sessiz: desteklenmeyen cihaz/izin hatası Android'i etkilemesin.
    }
  },

  async endBrushingSession(): Promise<void> {
    if (!isSupported || !nativeModule) return;
    try {
      await nativeModule.endBrushingActivity();
    } catch {
      // Sessiz: aktivite yoksa hata sayma.
    }
  },
};

