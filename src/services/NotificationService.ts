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

const REMINDER_KEY = (userId: string, date: string, sessionType: SessionType) =>
  `reminders_${userId}_${date}_${sessionType}`;
const DAILY_REMINDER_IDS_KEY = (userId: string) => `daily_reminder_ids_${userId}`;
const DAILY_REMINDER_SIG_KEY = (userId: string) => `daily_reminder_signature_${userId}`;
const COMPLETED_SESSION_MUTE_KEY = (userId: string, date: string, sessionType: SessionType) =>
  `completed_session_mute_${userId}_${date}_${sessionType}`;
const TOOTHBRUSH_REMINDER_ID_KEY = (scope: string) => `toothbrush_replace_reminder_id_${scope}`;
const TOOTHBRUSH_ENABLED_KEY = (scope: string) => `toothbrush_replace_enabled_${scope}`;
const TOOTHBRUSH_INTERVAL_KEY = (scope: string) => `toothbrush_replace_interval_${scope}`;
const TOOTHBRUSH_NEXT_DUE_KEY = (scope: string) => `toothbrush_replace_next_due_${scope}`;
const SESSION_TYPES: SessionType[] = ['morning', 'midday', 'evening'];

const getPlannedSessionTypesForUser = (user: User): SessionType[] => {
  const count = Math.min(3, Math.max(1, Number(user.dailySessionCount ?? 2)));
  if (count === 1) return ['morning'];
  if (count === 2) return ['morning', 'evening'];
  return ['morning', 'midday', 'evening'];
};

const getSessionTimeForUser = (user: User, sessionType: SessionType): string => {
  if (sessionType === 'morning') return user.morningTime ?? '08:00';
  if (sessionType === 'midday') return user.middayTime ?? '14:00';
  return user.eveningTime ?? '21:00';
};

const cancelOrphanedScheduledNotifications = async (
  userId: string,
  sessionType?: SessionType
): Promise<void> => {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const targets = all.filter((n) => {
    const data = n.content.data as { userId?: unknown; sessionType?: unknown } | undefined;
    if (!data || data.userId !== userId) return false;
    if (sessionType) return data.sessionType === sessionType;
    return SESSION_TYPES.includes(data.sessionType as SessionType);
  });
  if (targets.length === 0) return;
  await Promise.all(
    targets.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
};

const getScheduledSessionNotifications = async (
  userId: string
): Promise<Notifications.NotificationRequest[]> => {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  return all.filter((n) => {
    const data = n.content.data as { userId?: unknown; sessionType?: unknown } | undefined;
    if (!data || data.userId !== userId) return false;
    return SESSION_TYPES.includes(data.sessionType as SessionType);
  });
};

const clearTodaySessionReminderStorage = async (userId: string): Promise<void> => {
  const date = todayKey();
  await AsyncStorage.multiRemove([
    REMINDER_KEY(userId, date, 'morning'),
    REMINDER_KEY(userId, date, 'midday'),
    REMINDER_KEY(userId, date, 'evening'),
    DAILY_REMINDER_IDS_KEY(userId), // legacy
  ]);
};

const cancelStoredSessionReminders = async (
  userId: string,
  sessionType: SessionType
): Promise<void> => {
  const date = todayKey();
  const raw = await AsyncStorage.getItem(REMINDER_KEY(userId, date, sessionType));
  if (!raw) return;
  try {
    const ids = JSON.parse(raw) as string[];
    if (Array.isArray(ids) && ids.length > 0) {
      await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    }
  } catch {}
  await AsyncStorage.removeItem(REMINDER_KEY(userId, date, sessionType));
};

const shouldSuppressNotification = async (data: unknown): Promise<boolean> => {
  if (!data || typeof data !== 'object') return false;
  const payload = data as { userId?: unknown; sessionType?: unknown };
  if (typeof payload.userId !== 'string') return false;
  if (!SESSION_TYPES.includes(payload.sessionType as SessionType)) return false;
  const muted = await AsyncStorage.getItem(
    COMPLETED_SESSION_MUTE_KEY(payload.userId, todayKey(), payload.sessionType)
  );
  return muted === '1';
};

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const muted = await shouldSuppressNotification(notification.request.content.data);
    return {
      shouldPlaySound: muted ? false : true,
      shouldSetBadge: false,
      shouldShowBanner: muted ? false : true,
      shouldShowList: muted ? false : true
    };
  }
});

export const NotificationService = {
  getToothbrushReminderScope(userId?: string): string {
    return userId ?? 'device';
  },

  async getToothbrushReminderSettings(userId?: string): Promise<{
    enabled: boolean;
    intervalDays: 30 | 45 | 60;
  }> {
    const scope = this.getToothbrushReminderScope(userId);
    const [enabledRaw, intervalRaw] = await Promise.all([
      AsyncStorage.getItem(TOOTHBRUSH_ENABLED_KEY(scope)),
      AsyncStorage.getItem(TOOTHBRUSH_INTERVAL_KEY(scope)),
    ]);
    const intervalParsed = Number(intervalRaw);
    const intervalDays = (intervalParsed === 30 || intervalParsed === 45 || intervalParsed === 60
      ? intervalParsed
      : 45) as 30 | 45 | 60;
    return {
      enabled: enabledRaw !== 'false',
      intervalDays,
    };
  },

  async saveToothbrushReminderSettings(
    settings: { enabled: boolean; intervalDays: 30 | 45 | 60 },
    userId?: string
  ): Promise<void> {
    const scope = this.getToothbrushReminderScope(userId);
    await Promise.all([
      AsyncStorage.setItem(TOOTHBRUSH_ENABLED_KEY(scope), settings.enabled ? 'true' : 'false'),
      AsyncStorage.setItem(TOOTHBRUSH_INTERVAL_KEY(scope), String(settings.intervalDays)),
    ]);
  },

  async cancelToothbrushReplacementReminder(userId?: string): Promise<void> {
    const scope = this.getToothbrushReminderScope(userId);
    const key = TOOTHBRUSH_REMINDER_ID_KEY(scope);
    const oldId = await AsyncStorage.getItem(key);
    if (oldId) {
      try {
        await Notifications.cancelScheduledNotificationAsync(oldId);
      } catch {}
      await AsyncStorage.removeItem(key);
    }
    await AsyncStorage.removeItem(TOOTHBRUSH_NEXT_DUE_KEY(scope));
  },

  async getToothbrushReplacementCountdown(userId?: string): Promise<{
    enabled: boolean;
    intervalDays: 30 | 45 | 60;
    daysLeft: number | null;
  }> {
    const scope = this.getToothbrushReminderScope(userId);
    const settings = await this.getToothbrushReminderSettings(userId);
    if (!settings.enabled) {
      return { enabled: false, intervalDays: settings.intervalDays, daysLeft: null };
    }
    const nextDueRaw = await AsyncStorage.getItem(TOOTHBRUSH_NEXT_DUE_KEY(scope));
    if (!nextDueRaw) {
      // Eski kullanıcılarda referans tarih yoksa, interval'i başlangıç kabul et.
      return { enabled: true, intervalDays: settings.intervalDays, daysLeft: settings.intervalDays };
    }
    const nextDueMs = Number(nextDueRaw);
    if (!Number.isFinite(nextDueMs)) {
      return { enabled: true, intervalDays: settings.intervalDays, daysLeft: settings.intervalDays };
    }
    const diff = Math.ceil((nextDueMs - Date.now()) / (24 * 60 * 60 * 1000));
    return {
      enabled: true,
      intervalDays: settings.intervalDays,
      daysLeft: Math.max(0, diff),
    };
  },

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

    const scheduleSession = async (sessionType: SessionType, timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      const baseMin = h * 60 + m;
      const offsets = [0, 15, 30, 45];
      const ids: string[] = [];
      const configs: { title: string; body: string }[] = [
        {
          title: t('notifBrushTimeTitle', lang),
          body: sessionType === 'morning'
            ? t('notifMorningBody', lang)
            : sessionType === 'midday'
              ? t('notifMiddayBody', lang)
              : t('notifEveningBody', lang)
        },
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
        ids.push(id);
      }
      await AsyncStorage.setItem(
        REMINDER_KEY(user.id, todayKey(), sessionType),
        JSON.stringify(ids)
      );
    };

    const plannedTypes = getPlannedSessionTypesForUser(user);
    for (const sessionType of plannedTypes) {
      await scheduleSession(sessionType, getSessionTimeForUser(user, sessionType));
    }
  },

  async cancelDailyBaseReminders(userId: string): Promise<void> {
    await cancelOrphanedScheduledNotifications(userId);
    const date = todayKey();
    const [morningRaw, middayRaw, eveningRaw, legacyRaw] = await Promise.all([
      AsyncStorage.getItem(REMINDER_KEY(userId, date, 'morning')),
      AsyncStorage.getItem(REMINDER_KEY(userId, date, 'midday')),
      AsyncStorage.getItem(REMINDER_KEY(userId, date, 'evening')),
      AsyncStorage.getItem(DAILY_REMINDER_IDS_KEY(userId)),
    ]);
    try {
      const ids: string[] = [
        ...(morningRaw ? (JSON.parse(morningRaw) as string[]) : []),
        ...(middayRaw ? (JSON.parse(middayRaw) as string[]) : []),
        ...(eveningRaw ? (JSON.parse(eveningRaw) as string[]) : []),
      ];
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        ids.push(
          ...(Array.isArray(parsed)
            ? parsed
            : [...(parsed.morning || []), ...(parsed.evening || [])])
        );
      }
      await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    } catch {}
    await clearTodaySessionReminderStorage(userId);
  },

  /** Seans tamamlandığında o seansın kalan bildirimlerini iptal et */
  async cancelMissedReminder(userId: string, sessionType: SessionType): Promise<void> {
    // Daily tekrar eden bildirimleri tamamen silmeyelim; sadece bugünü susturalım.
    // Aksi halde kullanıcı bir kez tamamlayınca sonraki günlerin hatırlatmaları da kaybolur.
    await AsyncStorage.setItem(COMPLETED_SESSION_MUTE_KEY(userId, todayKey(), sessionType), '1');
  },

  async syncDailyBaseReminders(user: User): Promise<void> {
    const lang = await getStoredLanguage();
    const signature = `${user.dailySessionCount ?? 2}|${user.morningTime}|${user.middayTime ?? '14:00'}|${user.eveningTime}|${lang}`;
    const key = DAILY_REMINDER_SIG_KEY(user.id);
    const prev = await AsyncStorage.getItem(key);
    if (prev === signature) {
      // Aynı ayarlarda bile eski sürümden kalan duplike/eksik planları toparla.
      const scheduled = await getScheduledSessionNotifications(user.id);
      const targetCount = getPlannedSessionTypesForUser(user).length * 4;
      if (scheduled.length === targetCount) return;
    }
    await this.scheduleDailyBaseReminders(user);
    await AsyncStorage.setItem(key, signature);
  },

  /** Tekil seans hatırlatmaları (şu an kullanılmıyor) */
  async schedulePersistentReminders(userId: string, sessionType: SessionType) {
    await this.cancelSessionReminders(userId, sessionType);
  },

  async cancelSessionReminders(userId: string, sessionType: SessionType) {
    await cancelStoredSessionReminders(userId, sessionType);
  },

  async scheduleToothbrushReplacementReminder(args: {
    userId?: string;
    replaceDaysAgo: number | null;
    dontKnow: boolean;
    intervalDays?: number;
    hour?: number;
    minute?: number;
  }): Promise<void> {
    const pref = await this.getToothbrushReminderSettings(args.userId);
    const intervalDays = (args.intervalDays ?? pref.intervalDays) as 30 | 45 | 60;
    await this.saveToothbrushReminderSettings({ enabled: pref.enabled, intervalDays }, args.userId);
    if (!pref.enabled) {
      await this.cancelToothbrushReplacementReminder(args.userId);
      return;
    }

    const granted = await this.requestPermissions();
    if (!granted) return;

    const lang = await getStoredLanguage();
    const scope = this.getToothbrushReminderScope(args.userId);
    const key = TOOTHBRUSH_REMINDER_ID_KEY(scope);
    await this.cancelToothbrushReplacementReminder(args.userId);
    const daysAgo = args.dontKnow ? 45 : Math.max(0, args.replaceDaysAgo ?? 45);
    const now = new Date();
    const base = new Date(now);
    base.setDate(base.getDate() - daysAgo);

    let next = new Date(base);
    next.setDate(next.getDate() + intervalDays);
    next.setHours(args.hour ?? 20, args.minute ?? 0, 0, 0);
    while (next.getTime() <= now.getTime()) {
      next = new Date(next.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    }

    const secondsUntilDue = Math.max(
      60,
      Math.round((next.getTime() - now.getTime()) / 1000)
    );

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: t('notifToothbrushReplaceTitle', lang),
        body: t('notifToothbrushReplaceBody', lang),
        data: {
          type: 'toothbrush_replace',
          userId: args.userId ?? null,
        },
      },
      trigger: {
        type: 'timeInterval',
        seconds: secondsUntilDue,
        repeats: true,
      } as Notifications.NotificationTriggerInput,
    });

    await Promise.all([
      AsyncStorage.setItem(key, id),
      AsyncStorage.setItem(TOOTHBRUSH_NEXT_DUE_KEY(scope), String(next.getTime())),
    ]);
  },

  /** Bildirimler devre dışı - bildirim gönderilmez */
  async notifyMarketEvent(_title: string, _body: string, _data?: Record<string, unknown>) {
    // no-op
  }
};


