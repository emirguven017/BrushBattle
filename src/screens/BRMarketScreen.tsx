import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { colors } from '../utils/colors';
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

const CATEGORIES: MarketCategory[] = ['attack', 'defense', 'boost'];

const normalizeMarketError = (e: unknown, t: (key: string) => string): string => {
  const msg = e instanceof Error ? e.message : 'Islem basarisiz.';
  if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('permission')) {
    return t('unavailableTryAgain');
  }
  if (msg.toLowerCase().includes('yetersiz')) {
    return t('insufficientBalance');
  }
  return msg;
};

export const BRMarketScreen: React.FC = () => {
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
  const [events, setEvents] = useState<string[]>([]);

  const marketItems = useMemo(() => {
    const titleKey: Record<MarketItemId, string> = {
      freeze: 'marketItemFreezeTitle',
      score_drop: 'marketItemScoreDropTitle',
      shield: 'marketItemShieldTitle',
      streak_saver: 'marketItemStreakSaverTitle',
      double_points: 'marketItemDoublePointsTitle',
      rank_booster: 'marketItemRankBoosterTitle',
    };
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
        title: t(titleKey[i.id]),
        description: t(descKey[i.id]),
      }));
  }, [tab, t]);

  const load = async () => {
    if (!user) return;
    const [balance, inventory, fx, ev] = await Promise.all([
      InventoryService.getBalance(user.id),
      InventoryService.getInventory(user.id),
      EffectService.getEffects(user.id),
      MarketService.getRecentEvents(user.id),
    ]);
    setBrScore(balance.brScore);
    setItems(inventory.items);
    setEffects(fx.activeEffects);
    setEvents(ev.map((e) => e.message));
    if (user.groupId) {
      const gm = await GroupService.getGroupMembers(user.groupId);
      setMembers(gm.filter((m) => m.id !== user.id));
      if (!targetUserId && gm.length > 1) setTargetUserId(gm.find((m) => m.id !== user.id)?.id);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [user?.id, user?.groupId]);

  const onBuy = async (itemId: MarketItemId) => {
    if (!user) return;
    try {
      await MarketService.buyItem(user.id, itemId);
      await NotificationService.notifyMarketEvent(t('brMarketTitle'), t('marketNotifPurchased'));
      Alert.alert(t('info'), t('itemPurchased'));
      await load();
    } catch (e) {
      Alert.alert(t('error'), normalizeMarketError(e, t));
    }
  };

  const onUse = async (itemId: MarketItemId) => {
    if (!user) return;
    try {
      const isAttack = itemId === 'freeze' || itemId === 'score_drop';
      await MarketService.useItem(user.id, itemId, isAttack ? targetUserId : undefined);
      await NotificationService.notifyMarketEvent(t('brMarketTitle'), t('marketNotifUsed'));
      Alert.alert(t('info'), t('itemUsed'));
      await load();
    } catch (e) {
      Alert.alert(t('error'), normalizeMarketError(e, t));
    }
  };

  if (!user) return null;

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.primary }]}>
      <View style={[styles.greenHeader, { paddingTop: insets.top }]}>
        <View style={styles.titleBar}>
        <Text style={styles.title}>{t('brMarketTitle')}</Text>
        </View>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <BRBalanceCard brScore={brScore} />
        <InventoryList items={items} />
        <ActiveEffectsList effects={effects} />

        <View style={styles.tabs}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setTab(c)}
              style={[styles.tabBtn, tab === c && styles.tabBtnActive]}
            >
              <Text style={[styles.tabText, tab === c && styles.tabTextActive]}>
                {c === 'attack' ? t('attack') : c === 'defense' ? t('defense') : t('boost')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'attack' && (
          <View style={styles.targetBox}>
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
        )}

        {marketItems.map((item) => (
          <MarketItemCard
            key={item.id}
            item={item}
            owned={items[item.id] ?? 0}
            onBuy={() => onBuy(item.id)}
            onUse={() => onUse(item.id)}
          />
        ))}

        <View style={styles.eventBox}>
          <Text style={styles.eventTitle}>{t('socialEvents')}</Text>
          {events.length === 0 ? (
            <Text style={styles.eventItem}>{t('noEvents')}</Text>
          ) : (
            events.map((m, i) => (
              <Text key={`${m}_${i}`} style={styles.eventItem}>
                • {m}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  greenHeader: { backgroundColor: colors.primary },
  titleBar: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.white },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tabBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: colors.white },
  targetBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    padding: 12,
    marginBottom: 10,
  },
  targetTitle: { fontWeight: '700', color: colors.text, marginBottom: 8 },
  targetChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  targetChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  targetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  targetChipText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
  targetChipTextActive: { color: colors.white },
  eventBox: {
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  eventTitle: { color: colors.text, fontWeight: '800', marginBottom: 8 },
  eventItem: { color: colors.textSecondary, fontSize: 13, marginBottom: 4 },
});

