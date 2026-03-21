import type { MarketItem } from '../types';

export const MARKET_ITEMS: MarketItem[] = [
  {
    id: 'freeze',
    category: 'attack',
    icon: '❄️',
    title: 'Freeze',
    description: 'Hedef 2 saat liderlik puani kazanamaz.',
    cost: 40,
  },
  {
    id: 'score_drop',
    category: 'attack',
    icon: '📉',
    title: 'Score Drop',
    description: 'Hedefin haftalik puanindan 10 puan dusurur.',
    cost: 50,
  },
  {
    id: 'shield',
    category: 'defense',
    icon: '🛡️',
    title: 'Shield',
    description: 'Sonraki saldiriyi engeller. 24 saat aktif.',
    cost: 30,
  },
  {
    id: 'streak_saver',
    category: 'defense',
    icon: '💾',
    title: 'Streak Saver',
    description: 'Bir gunluk streak kaybini korur.',
    cost: 60,
  },
  {
    id: 'double_points',
    category: 'boost',
    icon: '⚡',
    title: 'Double Points',
    description: 'Sonraki fircalama seansi 2x puan verir.',
    cost: 40,
  },
  {
    id: 'rank_booster',
    category: 'boost',
    icon: '🚀',
    title: 'Rank Booster',
    description: 'Esit puanda siralamada one gecirir.',
    cost: 50,
  },
];

export const getMarketItem = (id: string) => MARKET_ITEMS.find((i) => i.id === id);

