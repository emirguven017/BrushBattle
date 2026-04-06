import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import * as Notifications from 'expo-notifications';
import { db } from '../firebase/config';
import { translations } from '../i18n/translations';
import { getStoredLanguage } from './NotificationService';

const INBOX_KIND_SHIELD_BLOCKED = 'attack_blocked_by_shield' as const;
const INBOX_KIND_SCORE_DROP_HIT = 'score_drop_hit' as const;

type InboxHandlers = {
  onScoreDropFeedback?: (payload: { title: string; message: string }) => void;
};

export const NotificationInboxService = {
  async pushShieldBlocked(
    defenderUserId: string,
    attackerUserId: string,
    attackItemId: 'freeze' | 'score_drop'
  ): Promise<void> {
    await addDoc(collection(db, 'users', defenderUserId, 'notificationInbox'), {
      kind: INBOX_KIND_SHIELD_BLOCKED,
      attackerUserId,
      attackItemId,
      createdAt: Date.now(),
    });
  },

  async pushScoreDropHit(
    targetUserId: string,
    attackerUserId: string,
    droppedPoints: number,
    currentPoints: number
  ): Promise<void> {
    await addDoc(collection(db, 'users', targetUserId, 'notificationInbox'), {
      kind: INBOX_KIND_SCORE_DROP_HIT,
      attackerUserId,
      droppedPoints,
      currentPoints,
      createdAt: Date.now(),
    });
  },

  /**
   * Savunan kullanıcının cihazında: gelen kutusundaki yeni kayıtlar için yerel bildirim gösterir.
   */
  subscribeInbox(userId: string, handlers?: InboxHandlers): () => void {
    const col = collection(db, 'users', userId, 'notificationInbox');
    return onSnapshot(
      col,
      (snap) => {
        snap.docChanges().forEach((change) => {
          if (change.type !== 'added') return;
          const data = change.doc.data() as {
            kind?: string;
            attackerUserId?: string;
            attackItemId?: string;
            droppedPoints?: number;
            currentPoints?: number;
          };
          const docId = change.doc.id;
          if (
            data.kind === INBOX_KIND_SHIELD_BLOCKED &&
            data.attackerUserId &&
            data.attackItemId
          ) {
            void processShieldBlockedInbox(
              userId,
              docId,
              data.attackerUserId,
              data.attackItemId as 'freeze' | 'score_drop'
            );
            return;
          }
          if (
            data.kind === INBOX_KIND_SCORE_DROP_HIT &&
            data.attackerUserId &&
            typeof data.droppedPoints === 'number' &&
            typeof data.currentPoints === 'number'
          ) {
            void processScoreDropHitInbox(
              userId,
              docId,
              data.attackerUserId,
              data.droppedPoints,
              data.currentPoints,
              handlers
            );
          }
        });
      },
      () => {
        // İzin yoksa veya kurallar deploy edilmediyse dinleyici sessizce sonlanır (log kirliliği olmasın).
      }
    );
  },
};

async function processShieldBlockedInbox(
  defenderUserId: string,
  inboxDocId: string,
  attackerUserId: string,
  attackItemId: 'freeze' | 'score_drop'
): Promise<void> {
  try {
    const lang = await getStoredLanguage();
    const attackerSnap = await getDoc(doc(db, 'users', attackerUserId));
    const attackerName =
      (attackerSnap.data() as { username?: string } | undefined)?.username ?? '?';

    const attackKey =
      attackItemId === 'freeze' ? 'marketItemFreezeTitle' : 'marketItemScoreDropTitle';
    const attackFeature = translations[lang][attackKey];
    const defenseFeature = translations[lang].marketItemShieldTitle;

    const title = translations[lang].notifShieldBlockedTitle;
    const body = translations[lang].notifShieldBlockedBody
      .replace('{attacker}', attackerName)
      .replace('{attackFeature}', attackFeature)
      .replace('{defenseFeature}', defenseFeature);

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });

    await deleteDoc(doc(db, 'users', defenderUserId, 'notificationInbox', inboxDocId));
  } catch {
    // Sessiz: izin / ağ hatası
  }
}

async function processScoreDropHitInbox(
  userId: string,
  inboxDocId: string,
  attackerUserId: string,
  droppedPoints: number,
  currentPoints: number,
  handlers?: InboxHandlers
): Promise<void> {
  try {
    const lang = await getStoredLanguage();
    const attackerSnap = await getDoc(doc(db, 'users', attackerUserId));
    const attackerName =
      (attackerSnap.data() as { username?: string } | undefined)?.username ?? '?';

    const title = translations[lang].notifScoreDropHitTitle;
    const body = translations[lang].notifScoreDropHitBody
      .replace('{attacker}', attackerName)
      .replace('{dropped}', String(droppedPoints))
      .replace('{current}', String(currentPoints));

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }

    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: null,
    });

    handlers?.onScoreDropFeedback?.({ title, message: body });
    await deleteDoc(doc(db, 'users', userId, 'notificationInbox', inboxDocId));
  } catch {
    // Sessiz: izin / ağ hatası
  }
}
