import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { GroupService } from '../services/GroupService';
import { CrownBadge, InviteCard } from '../components';
import { WeeklyRewardService } from '../services/weeklyRewardService';

export const GroupScreen: React.FC = () => {
  const { user } = useAuth();
  const [group, setGroup] = useState<{ name: string; code: string } | null>(null);
  const [members, setMembers] = useState<{ id: string; username: string; streak: number; badges: string[]; wins: number }[]>([]);
  const [championId, setChampionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapGroupError = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : 'Grup yuklenemedi';
    const lower = msg.toLowerCase();
    if (lower.includes('missing or insufficient permissions')) {
      return 'Bazi grup verilerine erisim izni yok. Temel bilgiler gosteriliyor.';
    }
    if (lower.includes('offline')) {
      return 'Su anda internete baglanilamiyor.';
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

  if (!user?.groupId) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.titleBar}>
          <Text style={styles.title}>👥 Grup</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Henüz gruba katılmadın</Text>
        <Text style={styles.emptyText}>
          Onboarding sırasında grup oluşturabilir veya davet kodu ile katılabilirsin.
        </Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <View style={styles.titleBar}>
          <Text style={styles.title}>👥 Grup</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleBar}>
        <Text style={styles.title}>👥 Grup</Text>
      </View>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {group && (
        <InviteCard groupName={group.name} inviteCode={group.code} />
      )}

      <Text style={styles.sectionTitle}>Üyeler</Text>
      {members.map((m, i) => (
        <View key={i} style={styles.memberRow}>
          <Text style={styles.memberIcon}>👤</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.username}</Text>
            {m.id === championId && <CrownBadge label="Champion" />}
            <Text style={styles.memberMeta}>👑 {m.wins}x Weekly Champion</Text>
            {m.badges.length > 0 && <Text style={styles.memberMeta}>{m.badges.join(' • ')}</Text>}
          </View>
          <Text style={styles.memberStreak}>🔥 {m.streak}</Text>
        </View>
      ))}
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center'
  },
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
  memberIcon: { marginRight: 12, fontSize: 20 },
  memberName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  memberMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  memberStreak: { fontSize: 14, fontWeight: '600', color: colors.primary },
  empty: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  errorBox: {
    backgroundColor: colors.errorLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16
  },
  errorText: { fontSize: 14, color: colors.error, fontWeight: '600' }
});
