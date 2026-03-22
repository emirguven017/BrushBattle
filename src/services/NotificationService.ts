import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionType, User } from '../types';
import { todayKey } from '../utils/date';
import { translations, type Language } from '../i18n/translations';

function t(key: string, lang: Language): string {
  return translations[lang][key] ?? key;
}

const LANGUAGE_KEY = '@brush_battle_language';

export async function getStoredLanguage(): Promise<Language> {
  const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  return saved === 'en' || saved === 'tr' ? saved : 'tr';
}

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
   * Kullanıcının kendi seans saatlerine (morningTime, eveningTime) göre her seans için
   * 1 saatlik dilimde 15 dk arayla 4 bildirim planlar. Her kullanıcının saatleri farklı olabilir.
   * 1. Fırçalama vakti geldi | 2. Son 30 dk | 3. Son 15 dk | 4. Seansı kaçırdın ama yine fırçalayabilirsin
   */
  async scheduleDailyBaseReminders(user: User): Promise<void> {
    const granted = await this.requestPermissions();
    if (!granted) return;

    const lang = await getStoredLanguage();
    await this.cancelDailyBaseReminders(user.id);

    const stored: { morning: string[]; evening: string[] } = { morning: [], evening: [] };
    const morningIds: string[] = [];
    const eveningIds: string[] = [];

    const scheduleSession = async (sessionType: 'morning' | 'evening', timeStr: string, outIds: string[]) => {
      const [h, m] = timeStr.split(':').map(Number);
      const baseMin = h * 60 + m;
      const offsets = [0, 15, 30, 45];
      const configs: { title: string; body: string }[] = [
        { title: t('notifBrushTimeTitle', lang), body: sessionType === 'morning' ? t('notifMorningBody', lang) : t('notifEveningBody', lang) },
        { title: t('notifReminderTitle', lang), body: t('notifReminder30Body', lang) },
        { title: t('notifReminderTitle', lang), body: t('notifReminder15Body', lang) },
        { title: t('notifMissedTitle', lang), body: t('notifMissedBody', lang) }
      ];
      for (let i = 0; i < 4; i++) {
        const totalMin = baseMin + offsets[i];
        const hour = Math.floor(totalMin / 60) % 24;
        const minute = totalMin % 60;
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: configs[i].title,
            body: configs[i].body,
            data: { sessionType, userId: user.id }
          },
          trigger: {
            type: 'daily',
            hour,
            minute
          } as Notifications.NotificationTriggerInput
        });
        outIds.push(id);
      }
    };

    await scheduleSession('morning', user.morningTime ?? '08:00', morningIds);
    await scheduleSession('evening', user.eveningTime ?? '21:00', eveningIds);

    stored.morning = morningIds;
    stored.evening = eveningIds;
    await AsyncStorage.setItem(DAILY_REMINDER_IDS_KEY(user.id), JSON.stringify(stored));
  },

  async cancelDailyBaseReminders(userId: string): Promise<void> {
    const raw = await AsyncStorage.getItem(DAILY_REMINDER_IDS_KEY(userId));
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const ids: string[] = Array.isArray(parsed)
        ? parsed
        : [...(parsed.morning || []), ...(parsed.evening || [])];
      await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    } catch {}
    await AsyncStorage.removeItem(DAILY_REMINDER_IDS_KEY(userId));
  },

  /** Seans tamamlandığında o seansın kalan bildirimlerini iptal et */
  async cancelMissedReminder(userId: string, sessionType: SessionType): Promise<void> {
    const key = sessionType === 'morning' ? 'morning' : 'evening';
    const raw = await AsyncStorage.getItem(DAILY_REMINDER_IDS_KEY(userId));
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as { morning?: string[]; evening?: string[] };
      const ids = stored[key];
      if (Array.isArray(ids) && ids.length > 0) {
        await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
        stored[key] = [];
        await AsyncStorage.setItem(DAILY_REMINDER_IDS_KEY(userId), JSON.stringify(stored));
      }
    } catch {}
  },

  async syncDailyBaseReminders(user: User): Promise<void> {
    const lang = await getStoredLanguage();
    const signature = `${user.morningTime}|${user.eveningTime}|${lang}`;
    const key = DAILY_REMINDER_SIG_KEY(user.id);
    const prev = await AsyncStorage.getItem(key);
    if (prev === signature) return;
    await this.scheduleDailyBaseReminders(user);
    await AsyncStorage.setItem(key, signature);
  },

  /** Bildirimler devre dışı - seans hatırlatması planlanmaz */
  async schedulePersistentReminders(userId: string, sessionType: SessionType) {
    await this.cancelSessionReminders(userId, sessionType);
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

  /** Bildirimler devre dışı - bildirim gönderilmez */
  async notifyMarketEvent(_title: string, _body: string, _data?: Record<string, unknown>) {
    // no-op
  }
};


