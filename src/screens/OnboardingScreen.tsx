import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { GroupService } from '../services/GroupService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export const OnboardingScreen: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? '');
  const [morningTime, setMorningTime] = useState(user?.morningTime ?? '08:00');
  const [eveningTime, setEveningTime] = useState(user?.eveningTime ?? '21:00');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [err, setErr] = useState('');

  const handleFinish = async () => {
    if (!user?.id) return;
    setErr('');
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        username: username.trim() || user.username,
        morningTime: morningTime || '08:00',
        eveningTime: eveningTime || '21:00',
        onboardingComplete: true
      });

      if (groupName.trim()) {
        await GroupService.createGroup(user.id, groupName.trim());
      } else if (inviteCode.trim()) {
        await GroupService.joinGroup(user.id, inviteCode.trim());
      }
      await refreshUser();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Bir hata oluştu');
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>Hoş geldin! 🪥</Text>
      </View>
    <View style={styles.container}>
      <TextInput style={styles.input} placeholder="Kullanıcı adı" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Sabah saati (örn. 08:00)" value={morningTime} onChangeText={setMorningTime} />
      <TextInput style={styles.input} placeholder="Akşam saati (örn. 21:00)" value={eveningTime} onChangeText={setEveningTime} />
      <Text style={styles.sub}>Grup oluştur veya koda ile katıl</Text>
      <TextInput style={styles.input} placeholder="Yeni grup adı" value={groupName} onChangeText={setGroupName} />
      <TextInput style={styles.input} placeholder="Davet kodu" value={inviteCode} onChangeText={setInviteCode} />
      {err ? <Text style={styles.error}>{err}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={handleFinish}>
        <Text style={styles.btnText}>Başla</Text>
      </TouchableOpacity>
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, padding: 24, justifyContent: 'center' },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.white },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.white
  },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 8 },
  error: { color: colors.error, marginBottom: 8 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  btnText: { color: colors.white, fontWeight: '600' }
});
