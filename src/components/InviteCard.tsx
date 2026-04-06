import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import * as ExpoLinking from 'expo-linking';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
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
          `${t('inviteJoinMessage')} ${inviteCode}\n` +
          `${t('inviteLink')} ${inviteLink}\n\n` +
          `${t('inviteStoreHint')}\n${androidStoreLink}`,
        title: t('inviteShareTitle')
      });
    } catch {}
  };

  return (
    <View style={styles.card}>
      <Text style={styles.groupName}>{groupName}</Text>
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>{t('inviteCodeLabel')}</Text>
        <Text style={styles.code}>{inviteCode}</Text>
      </View>
      <TouchableOpacity style={styles.btn} onPress={handleShare}>
        <Text style={styles.btnText}>{t('inviteFriend')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 22,
    marginBottom: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  groupName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 18,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  codeBox: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
  },
  codeLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, marginBottom: 6, letterSpacing: 0.2 },
  code: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: 5 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  btnText: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
