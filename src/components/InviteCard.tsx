import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { colors } from '../utils/colors';

interface InviteCardProps {
  groupName: string;
  inviteCode: string;
  onInvite?: () => void;
}

/** Card displaying group invite code with share button */
export const InviteCard: React.FC<InviteCardProps> = ({
  groupName,
  inviteCode,
  onInvite
}) => {
  const androidStoreLink = 'https://play.google.com/store/apps/details?id=com.brushbattle';

  const handleShare = async () => {
    if (onInvite) {
      onInvite();
      return;
    }
    try {
      const inviteLink = ExpoLinking.createURL('join', {
        queryParams: { code: inviteCode }
      });
      await Share.share({
        message:
          `Brush Battle'a katıl! Davet kodum: ${inviteCode}\n` +
          `Katılım linki: ${inviteLink}\n\n` +
          `Uygulama yüklü değilse buradan indir:\n${androidStoreLink}`,
        title: 'Brush Battle Daveti'
      });
    } catch {}
  };

  return (
    <View style={styles.card}>
      <Text style={styles.groupName}>{groupName}</Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Davet Kodu</Text>
        <Text style={styles.code}>{inviteCode}</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleShare}>
        <Text style={styles.btnText}>👥 Arkadaşını Davet Et</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4
  },
  groupName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center'
  },
  codeBox: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16
  },
  codeLabel: { fontSize: 12, color: colors.muted, marginBottom: 4 },
  code: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: 4 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center'
  },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '700' }
});
