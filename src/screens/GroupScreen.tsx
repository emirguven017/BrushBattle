import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../context/ThemeContext';
import { type Colors, headerTitle, ui } from '../utils/colors';
import { createUiStyles } from '../utils/uiStyles';
import { isIosUi } from '../utils/iosUi';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { GroupService } from '../services/GroupService';
import { CrownBadge, InviteCard } from '../components';
import { WeeklyRewardService } from '../services/weeklyRewardService';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';

export const GroupScreen: React.FC = () => {
  const colors = useColors();
  const uiStyles = useMemo(() => createUiStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);

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
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);

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
      setFeedbackModal({ title: t('inviteError'), message: msg });
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
      setFeedbackModal({ title: t('error'), message: msg });
    } finally {
      setCreateLoading(false);
    }
  };

  if (!user?.groupId) {
    return (
      <BrandedScreenBackground>
      <View style={styles.wrapper}>
        {!isIosUi ? (
          <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
            <View style={styles.titleBar}>
              <Text style={styles.title}>{t('groupTitle')}</Text>
            </View>
          </View>
        ) : null}
        <ScrollView
          style={styles.emptyScroll}
          contentContainerStyle={[styles.empty, uiStyles.content]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.emptyTitle}>{t('noGroupYet')}</Text>
          <Text style={styles.emptyText}>{t('groupOnboardingHint')}</Text>

          <View style={[styles.emptyCard, uiStyles.card]}>
            <View style={styles.emptyCardTitleRow}>
              <Ionicons name="people" size={18} color={colors.text} />
              <Text style={styles.emptyCardTitle}> {t('groupJoinSection')}</Text>
            </View>
            <TextInput
              style={styles.emptyInput}
              placeholder={t('inviteCode')}
              placeholderTextColor={colors.muted}
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

          <View style={[styles.emptyCard, uiStyles.card]}>
            <View style={styles.emptyCardTitleRow}>
              <Ionicons name="sparkles" size={18} color={colors.text} />
              <Text style={styles.emptyCardTitle}> {t('groupCreateSection')}</Text>
            </View>
            <TextInput
              style={styles.emptyInput}
              placeholder={t('newGroupName')}
              placeholderTextColor={colors.muted}
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
      <AppFeedbackModal
        visible={feedbackModal !== null}
        title={feedbackModal?.title ?? ''}
        message={feedbackModal?.message ?? ''}
        buttonText={t('ok')}
        onClose={() => setFeedbackModal(null)}
      />
      </View>
      </BrandedScreenBackground>
    );
  }

  if (loading) {
    return (
      <BrandedScreenBackground>
      <View style={styles.wrapper}>
        {!isIosUi ? (
          <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
            <View style={styles.titleBar}>
              <Text style={styles.title}>{t('groupTitle')}</Text>
            </View>
          </View>
        ) : null}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.white} />
        </View>
      </View>
      </BrandedScreenBackground>
    );
  }

  return (
    <BrandedScreenBackground>
    <View style={styles.wrapper}>
      {!isIosUi ? (
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{t('groupTitle')}</Text>
          </View>
        </View>
      ) : null}
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        isIosUi && { paddingTop: 6, paddingHorizontal: ui.screenPadding },
      ]}
    >
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

      <Text style={styles.sectionTitleBranded}>{t('members')}</Text>
      {members.map((m, i) => (
        <View key={m.id ?? i} style={styles.memberRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.username}</Text>
            {m.id === championId && <CrownBadge label={t('championLabel')} />}
            <View style={styles.memberMetaRow}>
              <Ionicons name="trophy" size={12} color={colors.muted} />
              <Text style={styles.memberMeta}>
                {' '}
                {m.wins}x {t('weeklyChampionX')}
              </Text>
            </View>
            {m.badges.length > 0 ? <Text style={styles.memberMeta}>{m.badges.join(' • ')}</Text> : null}
          </View>
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={15} color={colors.primary} />
            <Text style={styles.memberStreak}>{m.streak}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
    <AppFeedbackModal
      visible={feedbackModal !== null}
      title={feedbackModal?.title ?? ''}
      message={feedbackModal?.message ?? ''}
      buttonText={t('ok')}
      onClose={() => setFeedbackModal(null)}
    />
    </View>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  wrapper: { flex: 1 },
  greenHeader: { backgroundColor: colors.primary },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 44,
  },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: {
    ...headerTitle
  },
  /** Yeşil zemin üzerinde */
  sectionTitleBranded: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginBottom: 14,
    marginTop: 4,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: ui.radiusLg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: {
        elevation: 4,
      },
      default: {},
    }),
  },
  errorRow: { flexDirection: 'row', alignItems: 'center' },
  memberMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.successLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary + '33',
  },
  memberName: { fontSize: 17, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  memberMeta: { fontSize: 12, color: colors.muted, marginTop: 3, lineHeight: 16 },
  memberStreak: { fontSize: 15, fontWeight: '800', color: colors.primary, minWidth: 18, textAlign: 'center' },
  emptyScroll: { flex: 1, backgroundColor: 'transparent' },
  empty: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center'
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8, textAlign: 'center' },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 },
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
    fontSize: 16,
    color: colors.text,
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
