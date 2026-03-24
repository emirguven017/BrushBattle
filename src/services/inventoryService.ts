import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { MarketItemId, UserBalance, UserInventory } from '../types';

const balanceRef = (userId: string) => doc(db, 'userBalances', userId);
const inventoryRef = (userId: string) => doc(db, 'userInventory', userId);
const isOffline = (e: unknown) =>
  (e instanceof Error ? e.message.toLowerCase() : '').includes('offline');

export const InventoryService = {
  async getBalance(userId: string): Promise<UserBalance> {
    try {
      const snap = await getDoc(balanceRef(userId));
      if (!snap.exists()) {
        const init: UserBalance = { userId, brScore: 0 };
        await setDoc(balanceRef(userId), init);
        return init;
      }
      return snap.data() as UserBalance;
    } catch (e) {
      if (isOffline(e)) {
        return { userId, brScore: 0 };
      }
      throw e;
    }
  },

  async addBrScore(userId: string, amount: number): Promise<void> {
    if (amount === 0) return;
    // Dokuman yoksa olustur; mevcutsa brScore degerini sifirlamadan koru.
    await setDoc(balanceRef(userId), { userId }, { merge: true });
    await updateDoc(balanceRef(userId), { brScore: increment(amount) });
  },

  async spendBrScore(userId: string, amount: number): Promise<void> {
    const balance = await this.getBalance(userId);
    if (balance.brScore < amount) throw new Error('Yetersiz bakiye');
    await updateDoc(balanceRef(userId), { brScore: increment(-amount) });
  },

  async getInventory(userId: string): Promise<UserInventory> {
    try {
      const snap = await getDoc(inventoryRef(userId));
      if (!snap.exists()) {
        const init: UserInventory = { userId, items: {}, updatedAt: Date.now() };
        await setDoc(inventoryRef(userId), init);
        return init;
      }
      return snap.data() as UserInventory;
    } catch (e) {
      if (isOffline(e)) {
        return { userId, items: {}, updatedAt: Date.now() };
      }
      throw e;
    }
  },

  async addItem(userId: string, itemId: MarketItemId, quantity = 1): Promise<void> {
    const inv = await this.getInventory(userId);
    const current = inv.items[itemId] ?? 0;
    await setDoc(
      inventoryRef(userId),
      {
        userId,
        items: { ...inv.items, [itemId]: current + quantity },
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  },

  async consumeItem(userId: string, itemId: MarketItemId, quantity = 1): Promise<void> {
    const inv = await this.getInventory(userId);
    const current = inv.items[itemId] ?? 0;
    if (current < quantity) throw new Error('Envanterinde yeterli item yok.');
    await setDoc(
      inventoryRef(userId),
      {
        userId,
        items: { ...inv.items, [itemId]: current - quantity },
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  },
};

