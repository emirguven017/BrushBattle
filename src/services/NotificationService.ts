import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionType, User } from '../types';
import { dateKey, todayKey } from '../utils/date';
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
const TOOTHBRUSH_LAST_CHANGE_KEY = (scope: string) => `toothbrush_last_change_date_${scope}`;

function parseDateKeyLocal(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addCalendarDaysToDateKey(key: string, delta: number): string {
  const dt = parseDateKeyLocal(key);
  dt.setDate(dt.getDate() + delta);
  return dateKey(dt);
}

/** earlier <= later; tam takvim günü farkı */
function calendarDaysBetween(earlier: string, later: string): number {
  const d1 = parseDateKeyLocal(earlier);
  d1.setHours(0, 0, 0, 0);
  const d2 = parseDateKeyLocal(later);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));
}
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
    /** Son fırça değişim günü (YYYY-MM-DD); hatırlatma kapalıysa null */
    lastChangeDateKey: string | null;
    /** Planlanan bir sonraki değişim günü (YYYY-MM-DD); hatırlatma kapalıysa null */
    nextDueDateKey: string | null;
  }> {
    const scope = this.getToothbrushReminderScope(userId);
    const settings = await this.getToothbrushReminderSettings(userId);
    if (!settings.enabled) {
      return {
        enabled: false,
        intervalDays: settings.intervalDays,
        daysLeft: null,
        lastChangeDateKey: null,
        nextDueDateKey: null,
      };
    }

    let lastChange = await AsyncStorage.getItem(TOOTHBRUSH_LAST_CHANGE_KEY(scope));
    if (!lastChange) {
      const nextDueRaw = await AsyncStorage.getItem(TOOTHBRUSH_NEXT_DUE_KEY(scope));
      if (nextDueRaw) {
        const nextDueMs = Number(nextDueRaw);
        if (Number.isFinite(nextDueMs)) {
          const dueDay = dateKey(new Date(nextDueMs));
          lastChange = addCalendarDaysToDateKey(dueDay, -settings.intervalDays);
          await AsyncStorage.setItem(TOOTHBRUSH_LAST_CHANGE_KEY(scope), lastChange);
        }
      }
    }
    if (!lastChange) {
      lastChange = todayKey();
      await AsyncStorage.setItem(TOOTHBRUSH_LAST_CHANGE_KEY(scope), lastChange);
    }

    const elapsed = calendarDaysBetween(lastChange, todayKey());
    const daysLeft = Math.max(0, settings.intervalDays - elapsed);
    const nextDueDateKey = addCalendarDaysToDateKey(lastChange, settings.intervalDays);

    return {
      enabled: true,
      intervalDays: settings.intervalDays,
      daysLeft,
      lastChangeDateKey: lastChange,
      nextDueDateKey,
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
    /** Doğrudan son değişim tarihi (YYYY-MM-DD); verilirse replaceDaysAgo/dontKnow yok sayılır */
    lastChangeDateKey?: string;
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

    const hour = args.hour ?? 20;
    const minute = args.minute ?? 0;

    let lastChangeKey: string;
    if (args.lastChangeDateKey) {
      lastChangeKey = args.lastChangeDateKey;
    } else if (args.dontKnow) {
      lastChangeKey = todayKey();
    } else if (args.replaceDaysAgo != null && Number.isFinite(args.replaceDaysAgo)) {
      lastChangeKey = addCalendarDaysToDateKey(todayKey(), -Math.max(0, args.replaceDaysAgo));
    } else {
      lastChangeKey = todayKey();
    }

    await AsyncStorage.setItem(TOOTHBRUSH_LAST_CHANGE_KEY(scope), lastChangeKey);

    let nextDue = parseDateKeyLocal(lastChangeKey);
    nextDue.setDate(nextDue.getDate() + intervalDays);
    nextDue.setHours(hour, minute, 0, 0);

    const now = new Date();
    if (nextDue.getTime() <= now.getTime()) {
      nextDue = new Date(now);
      nextDue.setHours(hour, minute, 0, 0);
      if (nextDue.getTime() <= now.getTime()) {
        nextDue.setDate(nextDue.getDate() + 1);
      }
    }

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
        type: SchedulableTriggerInputTypes.DATE,
        date: nextDue,
      },
    });

    await Promise.all([
      AsyncStorage.setItem(key, id),
      AsyncStorage.setItem(TOOTHBRUSH_NEXT_DUE_KEY(scope), String(nextDue.getTime())),
    ]);
  },

  /** Kullanıcı diş fırçasını değiştirdi: sayaç bugünden yeniden interval gün sayar */
  async markToothbrushReplaced(userId?: string): Promise<void> {
    const pref = await this.getToothbrushReminderSettings(userId);
    if (!pref.enabled) return;
    await this.scheduleToothbrushReplacementReminder({
      userId,
      replaceDaysAgo: null,
      dontKnow: false,
      lastChangeDateKey: todayKey(),
      intervalDays: pref.intervalDays,
      hour: 20,
      minute: 0,
    });
  },

  /** Bildirimler devre dışı - bildirim gönderilmez */
  async notifyMarketEvent(_title: string, _body: string, _data?: Record<string, unknown>) {
    // no-op
  }
};


