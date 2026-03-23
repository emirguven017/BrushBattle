import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  doc,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Group } from '../types';

const randomCode = () =>
  Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

export const GroupService = {
  async createGroup(ownerId: string, name: string): Promise<Group> {
    const base: Omit<Group, 'id'> = {
      name,
      code: randomCode(),
      members: [ownerId],
      createdAt: Date.now()
    };
    const ref = await addDoc(collection(db, 'groups'), base);
    const group: Group = { id: ref.id, ...base };

    await updateDoc(doc(db, 'users', ownerId), { groupId: group.id });
    return group;
  },

  async joinGroup(userId: string, code: string): Promise<Group> {
    const q = query(collection(db, 'groups'), where('code', '==', code.trim().toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) {
      throw new Error('Bu davet koduyla grup bulunamadı.');
    }
    const gDoc = snap.docs[0];
    const data = gDoc.data() as Omit<Group, 'id'>;

    const members = data.members.includes(userId)
      ? data.members
      : [...data.members, userId];

    await updateDoc(doc(db, 'groups', gDoc.id), { members });
    await updateDoc(doc(db, 'users', userId), { groupId: gDoc.id });

    return { id: gDoc.id, ...data, members };
  },

  async getGroup(groupId: string): Promise<Group | null> {
    const snap = await getDoc(doc(db, 'groups', groupId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Group;
  },

  async getGroupMembers(groupId: string): Promise<import('../types').User[]> {
    const q = query(collection(db, 'users'), where('groupId', '==', groupId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as import('../types').User));
  },

  async leaveGroup(userId: string, groupId: string): Promise<void> {
    await Promise.all([
      updateDoc(doc(db, 'groups', groupId), { members: arrayRemove(userId) }),
      updateDoc(doc(db, 'users', userId), { groupId: null })
    ]);
  }
};


