import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { type Colors, headerTitle, ui } from '../utils/colors';
import { isIosUi } from '../utils/iosUi';
import { useColors } from '../context/ThemeContext';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { useTabJump } from '../context/TabJumpContext';
import { InventoryService } from '../services/inventoryService';
import { GroupService } from '../services/GroupService';
import { MarketService } from '../services/marketService';
import { NotificationService } from '../services/NotificationService';
import { EffectService } from '../services/effectService';
import type { ActiveEffect, EffectType, MarketItemId, User } from '../types';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { AppConfirmModal } from '../components/AppConfirmModal';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';

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
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation();
  const tabJump = useTabJump();
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
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);
  const [confirmState, setConfirmState] = useState<{ itemId: MarketItemId; title: string; message: string } | null>(null);

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
    if (msg === 'ERR_SELF_ATTACK') return t('cannotAttackSelf');
    if (msg === 'ERR_NO_GROUP') return t('joinGroupFirst');
    if (msg === 'ERR_DAILY_ATTACK_LIMIT') return t('dailyAttackLimitReached');
    if (msg === 'ERR_DOUBLE_POINTS_ACTIVE') return t('doublePointsAlreadyActive');
    if (msg === 'ERR_STREAK_SAVER_ACTIVE') return t('streakSaverAlreadyActive');
    if (msg === 'ERR_SHIELD_ALREADY_ACTIVE') return t('shieldAlreadyActive');
    if (msg === 'ERR_RANK_BOOSTER_ALREADY_ACTIVE') return t('rankBoosterAlreadyActive');
    if (msg === 'ERR_TARGET_ALREADY_FROZEN') return t('targetAlreadyFrozen');
    if (msg === 'ERR_EFFECT_ALREADY_ACTIVE') return t('effectAlreadyActive');
    if (msg.toLowerCase().includes('hedef')) return t('selectTargetFirst');
    if (msg.toLowerCase().includes('limit')) return t('dailyAttackLimitReached');
    return msg;
  };

  const performUse = async (itemId: MarketItemId) => {
    if (!user || busyItemId) return;
    const isAttack = ATTACK_ITEMS.includes(itemId);
    if (isAttack) {
      if (!user.groupId) {
        setFeedbackModal({ title: t('error'), message: t('joinGroupFirst') });
        return;
      }
      if (!targetUserId || targetUserId === user.id) {
        setFeedbackModal({ title: t('error'), message: t('cannotAttackSelf') });
        return;
      }
    }

    try {
      setBusyItemId(itemId);
      await MarketService.useItem(user.id, itemId, isAttack ? targetUserId : undefined);
      await NotificationService.notifyMarketEvent(t('useFeatureTitle'), t('itemUsed'));
      setFeedbackModal({ title: t('info'), message: t('itemUsed') });
      await load();
    } catch (e) {
      setFeedbackModal({ title: t('error'), message: normalizeError(e) });
      await load().catch(() => {});
    } finally {
      setBusyItemId(null);
    }
  };

  const onUse = (itemId: MarketItemId) => {
    if (!user || busyItemId) return;
    const isAttack = ATTACK_ITEMS.includes(itemId);
    if (isAttack) {
      if (!user.groupId) {
        setFeedbackModal({ title: t('error'), message: t('joinGroupFirst') });
        return;
      }
      if (!targetUserId || targetUserId === user.id) {
        setFeedbackModal({ title: t('error'), message: t('cannotAttackSelf') });
        return;
      }
    }
    const featureName = t(itemTitleKey[itemId]);
    const targetName = members.find((m) => m.id === targetUserId)?.username ?? t('you');
    const message = isAttack
      ? t('confirmUseFeatureTargetMessage')
          .replace('{target}', targetName)
          .replace('{feature}', featureName)
      : t('confirmUseFeatureSelfMessage')
          .replace('{feature}', featureName);

    setConfirmState({
      itemId,
      title: t('confirmUseFeatureTitle'),
      message,
    });
  };

  const goToMarket = () => {
    tabJump?.jumpToTab('BRMarket');
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
        <View style={styles.itemAccent} />
        <View style={styles.itemCardBody}>
        <View style={styles.itemIconWrap}>
          <Ionicons name={ITEM_ICONS[id]} size={22} color={colors.primaryDark} />
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.itemTitleRow}>
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
      </View>
    );
  };

  if (!user) return null;

  return (
    <BrandedScreenBackground>
    <View style={styles.wrapper}>
      {!isIosUi ? (
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={styles.title}>{t('useFeatureTitle')}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, isIosUi && { paddingHorizontal: 16 }]}
      >
        {isFullMode && (
          <View style={styles.targetBox}>
            <View style={styles.targetAccent} />
            <View style={styles.targetInner}>
            <Text style={styles.sectionTitleCard}>{t('selectedTarget')}</Text>
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
          </View>
        )}

        {isSelfMode && (
          <View style={styles.targetBox}>
            <View style={styles.targetAccent} />
            <View style={styles.targetInner}>
            <Text style={styles.sectionTitleCard}>{t('selectedTarget')}</Text>
            <View style={styles.fixedTargetPill}>
              <Text style={styles.fixedTargetPillText}>{t('useFeatureContextSelf')}</Text>
            </View>
            </View>
          </View>
        )}

        {isOpponentMode && (
          <View style={styles.targetBox}>
            <View style={styles.targetAccent} />
            <View style={styles.targetInner}>
            <Text style={styles.sectionTitleCard}>{t('selectedTarget')}</Text>
            <View style={styles.fixedTargetPill}>
              <Text style={styles.fixedTargetPillText}>
                {members.find((m) => m.id === initialTargetUserId)?.username ?? '…'}
              </Text>
            </View>
            </View>
          </View>
        )}

        {isOpponentMode && (
          <>
            <Text style={styles.sectionTitleBranded}>{t('targetFeatures')}</Text>
            {attackFeatureItems.map(({ id, quantity }) => renderItemCard(id, quantity))}
          </>
        )}

        {isSelfMode && (
          <>
            <Text style={styles.sectionTitleBranded}>{t('selfFeatures')}</Text>
            {selfFeatureItems.map(({ id, quantity }) => renderItemCard(id, quantity))}
          </>
        )}

        {isFullMode && (
          <>
            <Text style={styles.sectionTitleBranded}>{t('targetFeatures')}</Text>
            {attackFeatureItems.map(({ id, quantity }) => renderItemCard(id, quantity))}

            <Text style={[styles.sectionTitleBranded, styles.selfSectionTitle]}>{t('selfFeatures')}</Text>
            {selfFeatureItems.map(({ id, quantity }) => renderItemCard(id, quantity))}
          </>
        )}
    </ScrollView>
    <AppFeedbackModal
      visible={feedbackModal !== null}
      title={feedbackModal?.title ?? ''}
      message={feedbackModal?.message ?? ''}
      buttonText={t('ok')}
      onClose={() => setFeedbackModal(null)}
    />
    <AppConfirmModal
      visible={confirmState !== null}
      title={confirmState?.title ?? ''}
      message={confirmState?.message ?? ''}
      cancelText={t('cancel')}
      confirmText={t('use')}
      onCancel={() => setConfirmState(null)}
      onConfirm={() => {
        if (!confirmState) return;
        const id = confirmState.itemId;
        setConfirmState(null);
        performUse(id).catch(() => {});
      }}
    />
    </View>
    </BrandedScreenBackground>
  );
};

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
  },
  android: { elevation: 4 },
  default: {},
});

const createStyles = (colors: Colors) => StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: 'transparent' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: { ...headerTitle },
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  /** Yeşil zemin üzerinde */
  sectionTitleBranded: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.92)',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    marginBottom: 14,
    marginTop: 4,
  },
  selfSectionTitle: { marginTop: 10 },
  /** Beyaz kart içi küçük başlık */
  sectionTitleCard: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  targetBox: {
    borderRadius: ui.radiusLg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...cardShadow,
  },
  targetAccent: {
    height: 3,
    backgroundColor: colors.primary,
  },
  targetInner: {
    paddingHorizontal: ui.cardPadding,
    paddingVertical: ui.cardPadding,
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
    borderRadius: ui.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: colors.card,
    padding: 14,
    ...cardShadow,
  },
  emptyText: { color: colors.textSecondary, fontSize: 13 },
  fixedTargetPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  fixedTargetPillText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  itemCard: {
    borderRadius: ui.radiusLg,
    overflow: 'hidden',
    backgroundColor: colors.card,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    ...cardShadow,
  },
  itemAccent: {
    height: 3,
    backgroundColor: colors.primary,
  },
  itemCardBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: ui.cardPadding,
    paddingVertical: ui.cardPadding,
    gap: 12,
  },
  itemIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  itemDesc: { marginTop: 4, fontSize: 12, lineHeight: 17, color: colors.textSecondary },
  itemQty: { marginTop: 8, fontSize: 12, color: colors.muted, fontWeight: '700' },
  marketLinkBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  marketLinkText: { fontSize: 11, fontWeight: '800', color: colors.accent },
  useBtn: {
    borderRadius: 999,
    backgroundColor: colors.accent,
    paddingVertical: 11,
    paddingHorizontal: 14,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
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

