import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, headerTitle } from '../utils/colors';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { InventoryService } from '../services/inventoryService';
import { GroupService } from '../services/GroupService';
import { MarketService } from '../services/marketService';
import { NotificationService } from '../services/NotificationService';
import { EffectService } from '../services/effectService';
import type { ActiveEffect, EffectType, MarketItemId, User } from '../types';

const ITEM_ORDER: MarketItemId[] = [
  'freeze',
  'score_drop',
  'shield',
  'streak_saver',
  'double_points',
  'rank_booster',
];

const ATTACK_ITEMS: MarketItemId[] = ['freeze', 'score_drop'];
const ITEM_ICONS: Record<MarketItemId, keyof typeof Ionicons.glyphMap> = {
  freeze: 'snow',
  score_drop: 'trending-down',
  shield: 'shield-checkmark',
  streak_saver: 'save',
  double_points: 'flash',
  rank_booster: 'rocket',
};

const SELF_ITEM_TO_EFFECT: Partial<Record<MarketItemId, EffectType>> = {
  shield: 'shield',
  streak_saver: 'streak_saver',
  double_points: 'double_points',
  rank_booster: 'rank_booster',
};

export const UseFeatureScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const route = useRoute();
  const initialTargetUserId = (route.params as { targetUserId?: string } | undefined)?.targetUserId;

  const isSelfMode = Boolean(user && initialTargetUserId === user.id);
  const isOpponentMode = Boolean(
    user && initialTargetUserId && initialTargetUserId !== user.id
  );
  const isFullMode = !initialTargetUserId;

  const [members, setMembers] = useState<User[]>([]);
  const [items, setItems] = useState<Partial<Record<MarketItemId, number>>>({});
  const [selfActiveEffects, setSelfActiveEffects] = useState<ActiveEffect[]>([]);
  const [targetActiveEffects, setTargetActiveEffects] = useState<ActiveEffect[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | undefined>(initialTargetUserId);
  const [busyItemId, setBusyItemId] = useState<MarketItemId | null>(null);

  const itemTitleKey: Record<MarketItemId, string> = {
    freeze: 'marketItemFreezeTitle',
    score_drop: 'marketItemScoreDropTitle',
    shield: 'marketItemShieldTitle',
    streak_saver: 'marketItemStreakSaverTitle',
    double_points: 'marketItemDoublePointsTitle',
    rank_booster: 'marketItemRankBoosterTitle',
  };

  const itemDescKey: Record<MarketItemId, string> = {
    freeze: 'marketItemFreezeDesc',
    score_drop: 'marketItemScoreDropDesc',
    shield: 'marketItemShieldDesc',
    streak_saver: 'marketItemStreakSaverDesc',
    double_points: 'marketItemDoublePointsDesc',
    rank_booster: 'marketItemRankBoosterDesc',
  };

  const load = useCallback(async () => {
    if (!user) return;
    const attackTargetId =
      targetUserId && targetUserId !== user.id ? targetUserId : null;
    const [inventory, groupMembers, fxSelf, fxTarget] = await Promise.all([
      InventoryService.getInventory(user.id),
      user.groupId ? GroupService.getGroupMembers(user.groupId) : Promise.resolve([]),
      EffectService.getEffects(user.id),
      attackTargetId
        ? EffectService.getEffects(attackTargetId)
        : Promise.resolve({ activeEffects: [] as ActiveEffect[] }),
    ]);
    setItems(inventory.items);
    setSelfActiveEffects(fxSelf.activeEffects);
    setTargetActiveEffects(fxTarget.activeEffects);
    const others = groupMembers.filter((m) => m.id !== user.id);
    setMembers(others);

    if (initialTargetUserId === user.id) {
      setTargetUserId(undefined);
      return;
    }
    if (initialTargetUserId && others.some((m) => m.id === initialTargetUserId)) {
      setTargetUserId(initialTargetUserId);
      return;
    }
    if (initialTargetUserId) {
      setTargetUserId(undefined);
      return;
    }
    setTargetUserId((prev) => {
      if (prev && others.some((m) => m.id === prev)) return prev;
      return others[0]?.id;
    });
  }, [initialTargetUserId, user, targetUserId]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => {});
    }, [load])
  );

  const subtitleText = useMemo(() => {
    if (isSelfMode) return t('useFeatureSubtitleSelfOnly');
    if (isOpponentMode) {
      const name =
        members.find((m) => m.id === initialTargetUserId)?.username ?? '';
      return t('useFeatureSubtitleOpponentOnly').replace('{name}', name || '…');
    }
    return t('useFeatureSubtitle');
  }, [isSelfMode, isOpponentMode, members, initialTargetUserId, t]);

  const attackFeatureItems = useMemo(
    () => ITEM_ORDER
      .filter((id) => ATTACK_ITEMS.includes(id))
      .map((id) => ({ id, quantity: items[id] ?? 0 })),
    [items]
  );
  const selfFeatureItems = useMemo(
    () => ITEM_ORDER
      .filter((id) => !ATTACK_ITEMS.includes(id))
      .map((id) => ({ id, quantity: items[id] ?? 0 })),
    [items]
  );

  const isEffectActiveForItem = useCallback(
    (itemId: MarketItemId): boolean => {
      if (itemId === 'score_drop') return false;
      if (itemId === 'freeze') {
        return targetActiveEffects.some((e) => e.type === 'frozen');
      }
      const et = SELF_ITEM_TO_EFFECT[itemId];
      if (!et) return false;
      return selfActiveEffects.some((e) => e.type === et);
    },
    [selfActiveEffects, targetActiveEffects]
  );

  const normalizeError = (e: unknown): string => {
    const msg = e instanceof Error ? e.message : t('somethingWrong');
    const attackTargetName =
      targetUserId && members.find((m) => m.id === targetUserId)?.username;
    if (msg === 'ERR_SCORE_DROP_BLOCKED') {
      return t('scoreDropBlockedByShield').replace('{name}', attackTargetName ?? '…');
    }
    if (msg === 'ERR_FREEZE_BLOCKED') {
      return t('freezeBlockedByShield').replace('{name}', attackTargetName ?? '…');
    }
    if (msg === 'ERR_ATTACK_TARGET_ZERO_POINTS') {
      return t('attackTargetZeroPoints').replace('{name}', attackTargetName ?? '…');
    }
    if (msg === 'ERR_TARGET_REQUIRED') return t('selectTargetFirst');
    if (msg === 'ERR_DAILY_ATTACK_LIMIT') return t('dailyAttackLimitReached');
    if (msg === 'ERR_DOUBLE_POINTS_ACTIVE') return t('doublePointsAlreadyActive');
    if (msg === 'ERR_STREAK_SAVER_ACTIVE') return t('streakSaverAlreadyActive');
    if (msg.toLowerCase().includes('hedef')) return t('selectTargetFirst');
    if (msg.toLowerCase().includes('limit')) return t('dailyAttackLimitReached');
    return msg;
  };

  const performUse = async (itemId: MarketItemId) => {
    if (!user || busyItemId) return;
    const isAttack = ATTACK_ITEMS.includes(itemId);
    if (isAttack && !targetUserId) {
      Alert.alert(t('info'), t('selectTargetFirst'));
      return;
    }

    try {
      setBusyItemId(itemId);
      await MarketService.useItem(user.id, itemId, isAttack ? targetUserId : undefined);
      await NotificationService.notifyMarketEvent(t('useFeatureTitle'), t('itemUsed'));
      Alert.alert(t('info'), t('itemUsed'));
      await load();
    } catch (e) {
      Alert.alert(t('error'), normalizeError(e));
      await load().catch(() => {});
    } finally {
      setBusyItemId(null);
    }
  };

  const onUse = (itemId: MarketItemId) => {
    if (!user || busyItemId) return;
    const isAttack = ATTACK_ITEMS.includes(itemId);
    const featureName = t(itemTitleKey[itemId]);
    const targetName = members.find((m) => m.id === targetUserId)?.username ?? t('you');
    const message = isAttack
      ? t('confirmUseFeatureTargetMessage')
          .replace('{target}', targetName)
          .replace('{feature}', featureName)
      : t('confirmUseFeatureSelfMessage')
          .replace('{feature}', featureName);

    Alert.alert(
      t('confirmUseFeatureTitle'),
      message,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('use'),
          onPress: () => {
            performUse(itemId);
          }
        }
      ]
    );
  };

  const goToMarket = () => {
    const parentNav = navigation.getParent();
    if (parentNav) {
      (parentNav as { navigate: (name: string) => void }).navigate('BRMarket');
      return;
    }
    (navigation as { navigate: (name: string) => void }).navigate('BRMarket');
  };

  const renderItemCard = (id: MarketItemId, quantity: number) => {
    const unavailable = quantity <= 0;
    const effectActive = isEffectActiveForItem(id);
    const useDisabled = busyItemId !== null || unavailable || effectActive;
    const dimUseBtn =
      (busyItemId !== null || unavailable) && !effectActive;
    const useLabel =
      busyItemId === id
        ? t('usingFeature')
        : effectActive
          ? t('featureActive')
          : t('use');
    return (
      <View key={id} style={styles.itemCard}>
        <View style={styles.itemInfo}>
          <View style={styles.itemTitleRow}>
            <Ionicons name={ITEM_ICONS[id]} size={16} color={colors.text} />
            <Text style={styles.itemTitle}>{t(itemTitleKey[id])}</Text>
          </View>
          <Text style={styles.itemDesc}>{t(itemDescKey[id])}</Text>
          <Text style={styles.itemQty}>
            {t('owned')}: {quantity}
          </Text>
          {unavailable && (
            <TouchableOpacity style={styles.marketLinkBtn} onPress={goToMarket} activeOpacity={0.85}>
              <Text style={styles.marketLinkText}>{t('buyFromMarketCta')}</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.useBtn,
            effectActive && styles.useBtnActiveState,
            dimUseBtn && styles.useBtnDisabled,
          ]}
          onPress={() => onUse(id)}
          disabled={useDisabled}
        >
          <Text style={styles.useBtnText}>{useLabel}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!user) return null;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{t('useFeatureTitle')}</Text>
        <Text style={styles.subtitle}>{subtitleText}</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {isFullMode && (
          <View style={styles.targetBox}>
            <Text style={styles.sectionTitle}>{t('selectedTarget')}</Text>
            {members.length === 0 ? (
              <Text style={styles.emptyText}>{t('noTargetAvailable')}</Text>
            ) : (
              <View style={styles.targetChips}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setTargetUserId(m.id)}
                    style={[styles.targetChip, targetUserId === m.id && styles.targetChipActive]}
                  >
                    <Text
                      style={[styles.targetChipText, targetUserId === m.id && styles.targetChipTextActive]}
                    >
                      {m.username}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {isSelfMode && (
          <View style={styles.targetBox}>
            <Text style={styles.sectionTitle}>{t('selectedTarget')}</Text>
            <View style={styles.fixedTargetPill}>
              <Text style={styles.fixedTargetPillText}>{t('useFeatureContextSelf')}</Text>
            </View>
          </View>
        )}

        {isOpponentMode && (
          <View style={styles.targetBox}>
            <Text style={styles.sectionTitle}>{t('selectedTarget')}</Text>
            <View style={styles.fixedTargetPill}>
              <Text style={styles.fixedTargetPillText}>
                {members.find((m) => m.id === initialTargetUserId)?.username ?? '…'}
              </Text>
            </View>
          </View>
        )}

        {isOpponentMode && (
          <>
            <Text style={styles.sectionTitle}>{t('targetFeatures')}</Text>
            {attackFeatureItems.map(({ id, quantity }) => renderItemCard(id, quantity))}
          </>
        )}

        {isSelfMode && (
          <>
            <Text style={styles.sectionTitle}>{t('selfFeatures')}</Text>
            {selfFeatureItems.map(({ id, quantity }) => renderItemCard(id, quantity))}
          </>
        )}

        {isFullMode && (
          <>
            <Text style={styles.sectionTitle}>{t('targetFeatures')}</Text>
            {attackFeatureItems.map(({ id, quantity }) => renderItemCard(id, quantity))}

            <Text style={[styles.sectionTitle, styles.selfSectionTitle]}>{t('selfFeatures')}</Text>
            {selfFeatureItems.map(({ id, quantity }) => renderItemCard(id, quantity))}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: { ...headerTitle },
  subtitle: { marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.9)', textAlign: 'center' },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 8 },
  selfSectionTitle: { marginTop: 8 },
  targetBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 12,
    marginBottom: 10,
  },
  targetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  targetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  targetChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  targetChipTextActive: { color: colors.white },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 14,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13 },
  fixedTargetPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  fixedTargetPillText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemInfo: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  itemDesc: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  itemQty: { marginTop: 6, fontSize: 12, color: colors.muted, fontWeight: '700' },
  marketLinkBtn: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  marketLinkText: { fontSize: 11, fontWeight: '800', color: colors.accent },
  useBtn: {
    borderRadius: 10,
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minWidth: 84,
    alignItems: 'center',
  },
  useBtnActiveState: {
    backgroundColor: colors.primary,
  },
  useBtnDisabled: { opacity: 0.7 },
  useBtnText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

