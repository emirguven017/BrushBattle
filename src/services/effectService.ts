import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { ActiveEffect, EffectType, UserEffects } from '../types';

const effectsRef = (userId: string) => doc(db, 'userEffects', userId);
const isOffline = (e: unknown) =>
  (e instanceof Error ? e.message.toLowerCase() : '').includes('offline');

const isExpired = (effect: ActiveEffect) =>
  typeof effect.expiresAt === 'number' && effect.expiresAt <= Date.now();

/** Aynı effect türünden birden fazla kayıt varsa tek satırda birleştir (en uzun süreli / en fazla kullanım). */
const pickStrongerEffect = (a: ActiveEffect, b: ActiveEffect): ActiveEffect => {
  const expA = a.expiresAt ?? 0;
  const expB = b.expiresAt ?? 0;
  if (expA !== expB) return expA > expB ? a : b;
  const uA = a.usesLeft ?? 0;
  const uB = b.usesLeft ?? 0;
  return uA >= uB ? a : b;
};

export const dedupeEffectsByType = (effects: ActiveEffect[]): ActiveEffect[] => {
  const byType = new Map<EffectType, ActiveEffect>();
  for (const e of effects) {
    if (isExpired(e)) continue;
    const cur = byType.get(e.type);
    if (!cur) {
      byType.set(e.type, e);
    } else {
      byType.set(e.type, pickStrongerEffect(e, cur));
    }
  }
  return Array.from(byType.values());
};

export const EffectService = {
  async getEffects(userId: string): Promise<UserEffects> {
    try {
      const snap = await getDoc(effectsRef(userId));
      if (!snap.exists()) {
        const init: UserEffects = { userId, activeEffects: [], updatedAt: Date.now() };
        await setDoc(effectsRef(userId), init);
        return init;
      }
      const data = snap.data() as UserEffects;
      const cleaned = data.activeEffects.filter((e) => !isExpired(e));
      const deduped = dedupeEffectsByType(cleaned);
      const needsPersist =
        deduped.length !== cleaned.length || cleaned.length !== data.activeEffects.length;
      if (needsPersist) {
        await setDoc(effectsRef(userId), { ...data, activeEffects: deduped, updatedAt: Date.now() }, { merge: true });
      }
      return { ...data, activeEffects: deduped };
    } catch (e) {
      if (isOffline(e)) {
        return { userId, activeEffects: [], updatedAt: Date.now() };
      }
      throw e;
    }
  },

  async addEffect(userId: string, effect: Omit<ActiveEffect, 'id'>): Promise<void> {
    const docData = await this.getEffects(userId);
    if (docData.activeEffects.some((e) => e.type === effect.type)) {
      throw new Error('ERR_EFFECT_ALREADY_ACTIVE');
    }
    const newEffect: ActiveEffect = {
      id: `${effect.type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...effect,
    };
    await setDoc(
      effectsRef(userId),
      {
        userId,
        activeEffects: [...docData.activeEffects, newEffect],
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  },

  async removeEffect(userId: string, effectId: string): Promise<void> {
    const docData = await this.getEffects(userId);
    await setDoc(
      effectsRef(userId),
      {
        userId,
        activeEffects: docData.activeEffects.filter((e) => e.id !== effectId),
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  },

  /** Aynı türdeki tüm etkileri kaldır (haftalık ödül yenileme vb.) */
  async removeEffectsOfType(userId: string, type: EffectType): Promise<void> {
    const docData = await this.getEffects(userId);
    const next = docData.activeEffects.filter((e) => e.type !== type);
    if (next.length === docData.activeEffects.length) return;
    await setDoc(
      effectsRef(userId),
      { userId, activeEffects: next, updatedAt: Date.now() },
      { merge: true }
    );
  },

  async hasActiveEffect(userId: string, type: EffectType): Promise<ActiveEffect | null> {
    const docData = await this.getEffects(userId);
    return docData.activeEffects.find((e) => e.type === type) ?? null;
  },

  async consumeOneUse(userId: string, type: EffectType): Promise<boolean> {
    const docData = await this.getEffects(userId);
    const idx = docData.activeEffects.findIndex((e) => e.type === type);
    if (idx < 0) return false;
    const target = docData.activeEffects[idx];
    const nextEffects = [...docData.activeEffects];
    if ((target.usesLeft ?? 1) <= 1) {
      nextEffects.splice(idx, 1);
    } else {
      nextEffects[idx] = { ...target, usesLeft: (target.usesLeft ?? 1) - 1 };
    }
    await setDoc(
      effectsRef(userId),
      { userId, activeEffects: nextEffects, updatedAt: Date.now() },
      { merge: true }
    );
    return true;
  },

  async clearAllEffects(userId: string): Promise<void> {
    await setDoc(
      effectsRef(userId),
      { userId, activeEffects: [], updatedAt: Date.now() },
      { merge: true }
    );
  },
};

