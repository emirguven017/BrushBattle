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

const INBOX_KIND = 'attack_blocked_by_shield' as const;

export const NotificationInboxService = {
  async pushShieldBlocked(
    defenderUserId: string,
    attackerUserId: string,
    attackItemId: 'freeze' | 'score_drop'
  ): Promise<void> {
    await addDoc(collection(db, 'users', defenderUserId, 'notificationInbox'), {
      kind: INBOX_KIND,
      attackerUserId,
      attackItemId,
      createdAt: Date.now(),
    });
  },

  /**
   * Savunan kullanıcının cihazında: gelen kutusundaki yeni kayıtlar için yerel bildirim gösterir.
   */
  subscribeInbox(userId: string): () => void {
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
          };
          if (data.kind !== INBOX_KIND || !data.attackerUserId || !data.attackItemId) return;
          const docId = change.doc.id;
          void processShieldBlockedInbox(
            userId,
            docId,
            data.attackerUserId,
            data.attackItemId as 'freeze' | 'score_drop'
          );
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
