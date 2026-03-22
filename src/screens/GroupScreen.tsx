import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { GroupService } from '../services/GroupService';
import { CrownBadge, InviteCard } from '../components';
import { WeeklyRewardService } from '../services/weeklyRewardService';

export const GroupScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const [group, setGroup] = useState<{ name: string; code: string } | null>(null);
  const [members, setMembers] = useState<{ id: string; username: string; streak: number; badges: string[]; wins: number }[]>([]);
  const [championId, setChampionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const mapGroupError = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : t('groupLoadFailed');
    const lower = msg.toLowerCase();
    if (lower.includes('missing or insufficient permissions')) {
      return t('groupPermissionError');
    }
    if (lower.includes('offline')) {
      return t('groupOfflineError');
    }
    return msg;
  };

  useEffect(() => {
    if (!user?.groupId) {
      setLoading(false);
      setGroup(null);
      setMembers([]);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([GroupService.getGroup(user.groupId), GroupService.getGroupMembers(user.groupId)])
      .then(async ([g, m]) => {
        if (g) setGroup({ name: g.name, code: g.code });

        // Temel uye listesi her durumda gorunsun.
        const baseMembers = m.map((u) => ({
          id: u.id,
          username: u.username,
          streak: u.streak ?? 0,
          badges: [] as string[],
          wins: 0,
        }));
        setMembers(baseMembers);

        // Haftalik liderlik verisi okunamazsa sayfayi bozma.
        try {
          const ranked = await WeeklyRewardService.getWeeklyLeaderboard(user.groupId!);
          setChampionId(ranked[0]?.userId ?? null);
        } catch (e) {
          setChampionId(null);
          setError(mapGroupError(e));
        }

        // Kullanici istatistikleri kullanici bazli okunamazsa sadece o uyeyi fallback yap.
        const withStats = await Promise.all(
          m.map(async (u) => {
            try {
              const st = await WeeklyRewardService.getUserStats(u.id);
              return {
                id: u.id,
                username: u.username,
                streak: u.streak ?? 0,
                badges: st.badges ?? [],
                wins: st.totalWins ?? 0,
              };
            } catch {
              return {
                id: u.id,
                username: u.username,
                streak: u.streak ?? 0,
                badges: [],
                wins: 0,
              };
            }
          })
        );
        setMembers(withStats);
      })
      .catch((e) => {
        setGroup(null);
        setMembers([]);
        setError(mapGroupError(e));
      })
      .finally(() => setLoading(false));
  }, [user?.groupId]);

  const handleJoinGroup = async () => {
    if (!user?.id || !joinCode.trim()) return;
    setJoinLoading(true);
    setError(null);
    try {
      await GroupService.joinGroup(user.id, joinCode.trim());
      await refreshUser();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('joinGroupFailed');
      Alert.alert(t('inviteError'), msg);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user?.id || !newGroupName.trim()) return;
    setCreateLoading(true);
    setError(null);
    try {
      await GroupService.createGroup(user.id, newGroupName.trim());
      await refreshUser();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t('errorGeneric');
      Alert.alert(t('error'), msg);
    } finally {
      setCreateLoading(false);
    }
  };

  if (!user?.groupId) {
    return (
      <View style={[styles.wrapper, { backgroundColor: colors.primary }]}>
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{t('groupTitle')}</Text>
          </View>
        </View>
        <ScrollView
          style={styles.emptyScroll}
          contentContainerStyle={styles.empty}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.emptyTitle}>{t('noGroupYet')}</Text>
          <Text style={styles.emptyText}>{t('groupOnboardingHint')}</Text>

          <View style={styles.emptyCard}>
            <View style={styles.emptyCardTitleRow}>
              <Ionicons name="people" size={18} color={colors.text} />
              <Text style={styles.emptyCardTitle}> {t('groupJoinSection')}</Text>
            </View>
            <TextInput
              style={styles.emptyInput}
              placeholder={t('inviteCode')}
              value={joinCode}
              onChangeText={setJoinCode}
              autoCapitalize="characters"
              editable={!joinLoading}
            />
            <TouchableOpacity
              style={[styles.emptyBtn, joinLoading && styles.emptyBtnDisabled]}
              onPress={handleJoinGroup}
              disabled={joinLoading}
            >
              {joinLoading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.emptyBtnText}>{t('joinGroupBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.emptyCard}>
            <View style={styles.emptyCardTitleRow}>
              <Ionicons name="sparkles" size={18} color={colors.text} />
              <Text style={styles.emptyCardTitle}> {t('groupCreateSection')}</Text>
            </View>
            <TextInput
              style={styles.emptyInput}
              placeholder={t('newGroupName')}
              value={newGroupName}
              onChangeText={setNewGroupName}
              editable={!createLoading}
            />
            <TouchableOpacity
              style={[styles.emptyBtn, styles.emptyBtnSecondary, createLoading && styles.emptyBtnDisabled]}
              onPress={handleCreateGroup}
              disabled={createLoading}
            >
              {createLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Text style={[styles.emptyBtnText, styles.emptyBtnTextSecondary]}>{t('createGroupBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.wrapper, { backgroundColor: colors.primary }]}>
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{t('groupTitle')}</Text>
          </View>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.primary }]}>
      <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
        <View style={styles.titleBar}>
          <Text style={styles.title}>{t('groupTitle')}</Text>
        </View>
      </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {error && (
        <View style={styles.errorBox}>
          <View style={styles.errorRow}>
          <Ionicons name="warning" size={18} color={colors.error} />
          <Text style={styles.errorText}> {error}</Text>
        </View>
        </View>
      )}

      {group && (
        <InviteCard groupName={group.name} inviteCode={group.code} />
      )}

      <Text style={styles.sectionTitle}>{t('members')}</Text>
      {members.map((m, i) => (
        <View key={i} style={styles.memberRow}>
          <Ionicons name="person" size={20} color={colors.muted} style={styles.memberIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.username}</Text>
            {m.id === championId && <CrownBadge label={t('championLabel')} />}
            <View style={styles.memberMetaRow}>
              <Ionicons name="trophy" size={12} color={colors.muted} />
              <Text style={styles.memberMeta}> {m.wins}x {t('weeklyChampionX')}</Text>
            </View>
            {m.badges.length > 0 && <Text style={styles.memberMeta}>{m.badges.join(' • ')}</Text>}
          </View>
          <View style={styles.memberStreakRow}>
          <Ionicons name="flame" size={16} color={colors.primary} />
          <Text style={styles.memberStreak}> {m.streak}</Text>
        </View>
        </View>
      ))}
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  greenHeader: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3
  },
  memberIcon: { marginRight: 12 },
  errorRow: { flexDirection: 'row', alignItems: 'center' },
  memberMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  memberStreakRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  memberMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  memberStreak: { fontSize: 14, fontWeight: '600', color: colors.primary },
  emptyScroll: { flex: 1, backgroundColor: colors.background },
  empty: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center'
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 24 },
  emptyCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder
  },
  emptyCardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  emptyCardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptyInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: colors.background,
    fontSize: 16
  },
  emptyBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  emptyBtnSecondary: { backgroundColor: colors.accentLight },
  emptyBtnDisabled: { opacity: 0.7 },
  emptyBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  emptyBtnTextSecondary: { color: colors.primary },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  errorText: { fontSize: 14, color: colors.error, fontWeight: '600' }
});
