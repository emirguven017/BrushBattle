import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionType, User } from '../types';
import { todayKey } from '../utils/date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

const REMINDER_KEY = (userId: string, date: string, sessionType: SessionType) =>
  `reminders_${userId}_${date}_${sessionType}`;
const DAILY_REMINDER_IDS_KEY = (userId: string) => `daily_reminder_ids_${userId}`;
const DAILY_REMINDER_SIG_KEY = (userId: string) => `daily_reminder_signature_${userId}`;

export const NotificationService = {
  async requestPermissions(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  // HH:mm string'ini {hour, minute} objesine çevirir
  parseTimeString(time: string): { hour: number; minute: number } {
    const [h, m] = time.split(':').map(Number);
    return { hour: h, minute: m };
  },

  /**
   * Kullanıcının sabah/akşam saatlerine göre günlük bildirim kur.
   * Bu fonksiyonu onboarding ve ayarlarda saat değiştiğinde çağırabilirsin.
   */
  async scheduleDailyBaseReminders(user: User): Promise<void> {
    const granted = await this.requestPermissions();
    if (!granted) return;

    await this.cancelDailyBaseReminders(user.id);

    const { hour: mh, minute: mm } = this.parseTimeString(user.morningTime);
    const { hour: eh, minute: em } = this.parseTimeString(user.eveningTime);

    const morningId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to brush your teeth 🪥',
        body: 'Morning brushing time!',
        data: { sessionType: 'morning', userId: user.id }
      },
      trigger: {
        type: 'daily',
        hour: mh,
        minute: mm
      } as Notifications.NotificationTriggerInput
    });

    const eveningId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time to brush your teeth 🪥',
        body: 'Evening brushing time!',
        data: { sessionType: 'evening', userId: user.id }
      },
      trigger: {
        type: 'daily',
        hour: eh,
        minute: em
      } as Notifications.NotificationTriggerInput
    });

    await AsyncStorage.setItem(
      DAILY_REMINDER_IDS_KEY(user.id),
      JSON.stringify([morningId, eveningId])
    );
  },

  async cancelDailyBaseReminders(userId: string): Promise<void> {
    const raw = await AsyncStorage.getItem(DAILY_REMINDER_IDS_KEY(userId));
    if (!raw) return;
    const ids: string[] = JSON.parse(raw);
    await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    await AsyncStorage.removeItem(DAILY_REMINDER_IDS_KEY(userId));
  },

  async syncDailyBaseReminders(user: User): Promise<void> {
    const signature = `${user.morningTime}|${user.eveningTime}`;
    const key = DAILY_REMINDER_SIG_KEY(user.id);
    const prev = await AsyncStorage.getItem(key);
    if (prev === signature) return;
    await this.scheduleDailyBaseReminders(user);
    await AsyncStorage.setItem(key, signature);
  },

  /**
   * Bir seans başladıktan sonra (Start Brushing) 10 / 30 / 60 dk sonra
   * hatırlatma bildirimleri planlar. Seans tamamlanınca iptal edilir.
   */
  async schedulePersistentReminders(userId: string, sessionType: SessionType) {
    const date = todayKey();
    const ids: string[] = [];
    // 1 saat boyunca her 10 dakikada bir hatirlat.
    const delays = [10, 20, 30, 40, 50, 60];

    for (const minutes of delays) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Don\'t forget to brush 🪥',
          body: 'Brushing timer bitti mi? Seansını onaylamayı unutma.',
          data: { sessionType, userId }
        },
        trigger: {
          type: 'timeInterval',
          seconds: minutes * 60,
          repeats: false
        } as Notifications.NotificationTriggerInput
      });
      ids.push(id);
    }

    await AsyncStorage.setItem(REMINDER_KEY(userId, date, sessionType), JSON.stringify(ids));
  },

  async cancelSessionReminders(userId: string, sessionType: SessionType) {
    const date = todayKey();
    const key = REMINDER_KEY(userId, date, sessionType);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    const ids: string[] = JSON.parse(raw);
    await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    await AsyncStorage.removeItem(key);
  },

  async notifyMarketEvent(title: string, body: string, data?: Record<string, unknown>) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
      },
      trigger: null,
    });
  }
};


