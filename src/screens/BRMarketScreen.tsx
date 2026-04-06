import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { type Colors, headerTitle, ui } from '../utils/colors';
import { createUiStyles } from '../utils/uiStyles';
import { isIosUi } from '../utils/iosUi';
import { useColors } from '../context/ThemeContext';
import type { MarketCategory, MarketItemId, User } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import { BRBalanceCard } from '../components/BRBalanceCard';
import { MarketItemCard } from '../components/MarketItemCard';
import { InventoryList } from '../components/InventoryList';
import { ActiveEffectsList } from '../components/ActiveEffectsList';
import { InventoryService } from '../services/inventoryService';
import { EffectService } from '../services/effectService';
import { MarketService } from '../services/marketService';
import { GroupService } from '../services/GroupService';
import { NotificationService } from '../services/NotificationService';
import { AppFeedbackModal } from '../components/AppFeedbackModal';
import { AppConfirmModal } from '../components/AppConfirmModal';
import { BrandedScreenBackground } from '../components/BrandedScreenBackground';

const CATEGORIES: MarketCategory[] = ['attack', 'defense', 'boost'];
const ITEM_TITLE_KEYS: Record<MarketItemId, string> = {
  freeze: 'marketItemFreezeTitle',
  score_drop: 'marketItemScoreDropTitle',
  shield: 'marketItemShieldTitle',
  streak_saver: 'marketItemStreakSaverTitle',
  double_points: 'marketItemDoublePointsTitle',
  rank_booster: 'marketItemRankBoosterTitle',
};

const normalizeMarketError = (
  e: unknown,
  t: (key: string) => string,
  attackTargetName?: string
): string => {
  const msg = e instanceof Error ? e.message : t('somethingWrong');
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
  if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('permission')) {
    return t('unavailableTryAgain');
  }
  if (msg.toLowerCase().includes('yetersiz')) {
    return t('insufficientBalance');
  }
  return msg;
};

export const BRMarketScreen: React.FC = () => {
  const colors = useColors();
  const uiStyles = useMemo(() => createUiStyles(colors), [colors]);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useLanguage();
  const route = useRoute();
  const selectedFromRoute = (route.params as { targetUserId?: string } | undefined)?.targetUserId;
  const [tab, setTab] = useState<MarketCategory>('attack');
  const [brScore, setBrScore] = useState(0);
  const [items, setItems] = useState<Partial<Record<MarketItemId, number>>>({});
  const [effects, setEffects] = useState<import('../types').ActiveEffect[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [targetUserId, setTargetUserId] = useState<string | undefined>(selectedFromRoute);
  const [feedbackModal, setFeedbackModal] = useState<{ title: string; message: string } | null>(null);
  const [confirmUseState, setConfirmUseState] = useState<{ itemId: MarketItemId; message: string } | null>(null);
  const [claimingFreeBr, setClaimingFreeBr] = useState(false);

  const showFeedback = (title: string, message: string) => {
    setFeedbackModal({ title, message });
  };

  const marketItems = useMemo(() => {
    const descKey: Record<MarketItemId, string> = {
      freeze: 'marketItemFreezeDesc',
      score_drop: 'marketItemScoreDropDesc',
      shield: 'marketItemShieldDesc',
      streak_saver: 'marketItemStreakSaverDesc',
      double_points: 'marketItemDoublePointsDesc',
      rank_booster: 'marketItemRankBoosterDesc',
    };
    return MarketService.listItems()
      .filter((i) => i.category === tab)
      .map((i) => ({
        ...i,
        title: t(ITEM_TITLE_KEYS[i.id]),
        description: t(descKey[i.id]),
      }));
  }, [tab, t]);

  const load = async () => {
    if (!user) return;
    const [balance, inventory, fx] = await Promise.all([
      InventoryService.getBalance(user.id),
      InventoryService.getInventory(user.id),
      EffectService.getEffects(user.id),
    ]);
    setBrScore(balance.brScore);
    setItems(inventory.items);
    setEffects(fx.activeEffects);
    if (user.groupId) {
      const gm = await GroupService.getGroupMembers(user.groupId);
      setMembers(gm.filter((m) => m.id !== user.id));
      if (!targetUserId && gm.length > 1) setTargetUserId(gm.find((m) => m.id !== user.id)?.id);
    } else {
      setMembers([]);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [user?.id, user?.groupId]);

  useEffect(() => {
    if (!user?.id) return;
    if (selectedFromRoute === user.id) {
      setTargetUserId(undefined);
      return;
    }
    if (selectedFromRoute) setTargetUserId(selectedFromRoute);
  }, [selectedFromRoute, user?.id]);

  useEffect(() => {
    if (members.length === 0) {
      setTargetUserId(undefined);
      return;
    }
    if (!targetUserId || !members.some((m) => m.id === targetUserId)) {
      setTargetUserId(members[0]?.id);
    }
  }, [members, targetUserId]);

  const onBuy = async (itemId: MarketItemId) => {
    if (!user) return;
    try {
      await MarketService.buyItem(user.id, itemId);
      await NotificationService.notifyMarketEvent(t('brMarketTitle'), t('marketNotifPurchased'));
      showFeedback(t('info'), `${t(ITEM_TITLE_KEYS[itemId])} ${t('itemPurchasedSuffix')}`);
      await load();
    } catch (e) {
      showFeedback(t('error'), normalizeMarketError(e, t));
    }
  };

  const onUse = async (itemId: MarketItemId) => {
    if (!user) return;
    const isAttack = itemId === 'freeze' || itemId === 'score_drop';
    if (isAttack) {
      if (!user.groupId) {
        showFeedback(t('error'), t('joinGroupFirst'));
        return;
      }
      if (!targetUserId || targetUserId === user.id) {
        showFeedback(t('error'), t('cannotAttackSelf'));
        return;
      }
    }
    const targetName = members.find((m) => m.id === targetUserId)?.username ?? t('you');
    const featureName = t(ITEM_TITLE_KEYS[itemId]);
    const message = isAttack
      ? t('confirmUseFeatureTargetMessage').replace('{target}', targetName).replace('{feature}', featureName)
      : t('confirmUseFeatureSelfMessage').replace('{feature}', featureName);

    setConfirmUseState({ itemId, message });
  };

  const onClaimFreeBr = async () => {
    if (!user || claimingFreeBr) return;
    setClaimingFreeBr(true);
    try {
      await InventoryService.addBrScore(user.id, 100);
      await load();
      showFeedback(t('info'), t('freeBrClaimedSuccess'));
    } catch {
      showFeedback(t('error'), t('somethingWrong'));
    } finally {
      setClaimingFreeBr(false);
    }
  };

  if (!user) return null;

  return (
    <BrandedScreenBackground>
    <View style={styles.wrapper}>
      {!isIosUi ? (
        <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
          <View style={styles.titleBar}>
            <Text style={styles.title}>{t('brMarketTitle')}</Text>
          </View>
        </View>
      ) : null}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          uiStyles.content,
          isIosUi && { paddingHorizontal: 16 },
        ]}
      >
        <BRBalanceCard brScore={brScore} />
        <TouchableOpacity
          style={[styles.freeBrBtn, claimingFreeBr && styles.freeBrBtnDisabled]}
          onPress={onClaimFreeBr}
          activeOpacity={0.88}
          disabled={claimingFreeBr}
        >
          <Text style={styles.freeBrBtnText}>{claimingFreeBr ? t('usingFeature') : t('freeBrButton')}</Text>
        </TouchableOpacity>
        <InventoryList items={items} />
        <ActiveEffectsList effects={effects} />

        <View style={[styles.marketBlock, styles.premiumCard]}>
          <View style={styles.marketBlockAccent} />

          {tab === 'attack' && (
            <>
              <View style={styles.targetSection}>
                <Text style={styles.targetTitle}>{t('selectTarget')}</Text>
                <View style={styles.targetChips}>
                  {members.map((m) => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setTargetUserId(m.id)}
                      style={[styles.targetChip, targetUserId === m.id && styles.targetChipActive]}
                    >
                      <Text style={[styles.targetChipText, targetUserId === m.id && styles.targetChipTextActive]}>
                        {m.username}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.marketDivider} />
            </>
          )}

          <View style={styles.tabsWrap}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setTab(c)}
                style={[
                  styles.tabBtn,
                  tab === c && styles.tabBtnActive,
                  isIosUi && { borderRadius: 10 },
                  isIosUi && tab !== c && styles.tabBtnIosPlain,
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    tab === c && styles.tabTextActive,
                    isIosUi && tab !== c && styles.tabTextIosMuted,
                  ]}
                >
                  {c === 'attack' ? t('attack') : c === 'defense' ? t('defense') : t('boost')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {marketItems.length > 0 && <View style={styles.marketDivider} />}

          {marketItems.map((item, index) => (
            <MarketItemCard
              key={item.id}
              item={item}
              owned={items[item.id] ?? 0}
              onBuy={() => onBuy(item.id)}
              onUse={() => onUse(item.id)}
              embedded
              isFirst={index === 0}
            />
          ))}
        </View>

      </ScrollView>

      <AppFeedbackModal
        visible={feedbackModal !== null}
        title={feedbackModal?.title ?? ''}
        message={feedbackModal?.message ?? ''}
        buttonText={t('ok') || 'OK'}
        onClose={() => setFeedbackModal(null)}
      />
      <AppConfirmModal
        visible={confirmUseState !== null}
        title={t('confirmUseFeatureTitle')}
        message={confirmUseState?.message ?? ''}
        cancelText={t('cancel')}
        confirmText={t('use')}
        onCancel={() => setConfirmUseState(null)}
        onConfirm={() => {
          if (!confirmUseState || !user) return;
          const itemId = confirmUseState.itemId;
          setConfirmUseState(null);
          const isAttack = itemId === 'freeze' || itemId === 'score_drop';
          MarketService.useItem(user.id, itemId, isAttack ? targetUserId : undefined)
            .then(async () => {
              await NotificationService.notifyMarketEvent(t('brMarketTitle'), t('marketNotifUsed'));
              showFeedback(t('info'), t('itemUsed'));
              await load();
            })
            .catch(async (e) => {
              const attackTargetName = members.find((m) => m.id === targetUserId)?.username;
              showFeedback(t('error'), normalizeMarketError(e, t, attackTargetName));
              await load().catch(() => {});
            });
        }}
      />
    </View>
    </BrandedScreenBackground>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  wrapper: { flex: 1 },
  greenHeader: { backgroundColor: colors.primary },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { ...headerTitle },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 30 },
  premiumCard: {
    borderRadius: ui.radiusLg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
    backgroundColor: colors.card,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
      },
      android: { elevation: 5 },
      default: {},
    }),
  },
  marketBlock: {
    marginBottom: 14,
    overflow: 'hidden',
  },
  marketBlockAccent: {
    height: 3,
    width: '100%',
    backgroundColor: colors.primary,
    opacity: 0.95,
  },
  marketDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.cardBorder,
    marginHorizontal: 0,
  },
  freeBrBtn: {
    marginBottom: 14,
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: colors.primaryDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  freeBrBtnDisabled: {
    opacity: 0.65,
  },
  freeBrBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tabsWrap: {
    flexDirection: 'row',
    gap: 8,
    padding: 6,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: '800', fontSize: 12 },
  tabTextActive: { color: colors.white },
  tabBtnIosPlain: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  tabTextIosMuted: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  targetSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  targetTitle: {
    fontWeight: '800',
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  targetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  targetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  targetChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '700' },
  targetChipTextActive: { color: colors.white },
});

