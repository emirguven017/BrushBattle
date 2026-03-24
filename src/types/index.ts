export type SessionType = 'morning' | 'evening';
export type SessionStatus = 'pending' | 'completed' | 'missed';

export interface User {
  id: string;
  username: string;
  email?: string;
  groupId?: string;
  points: number;
  streak: number;
  /** Pozitif streak kırıldıktan sonra ceza (-1,-2,-3) zinciri için */
  streakPenaltyMode?: boolean;
  morningTime: string;
  eveningTime: string;
  onboardingComplete?: boolean;
}

export interface Group {
  id: string;
  name: string;
  code: string;
  members: string[];
  createdAt: number;
}

export interface BrushSession {
  id: string;
  userId: string;
  date: string;
  sessionType: SessionType;
  scheduledTime?: string;
  status: SessionStatus;
  completedAt?: number;
  pointsEarned: number;
  dayBonusApplied?: boolean;
}

export interface LeaderboardRanking {
  userId: string;
  username: string;
  points: number;
  streak: number;
  completedSessions: number;
}

export type MarketCategory = 'attack' | 'defense' | 'boost';
export type MarketItemId =
  | 'freeze'
  | 'score_drop'
  | 'shield'
  | 'streak_saver'
  | 'double_points'
  | 'rank_booster';
export type EffectType =
  | 'frozen'
  | 'shield'
  | 'streak_saver'
  | 'double_points'
  | 'rank_booster'
  | 'bonus_points'
  | 'champion_crown';

export interface MarketItem {
  id: MarketItemId;
  category: MarketCategory;
  icon: string;
  title: string;
  description: string;
  cost: number;
}

export interface UserBalance {
  userId: string;
  brScore: number;
}

export interface UserInventory {
  userId: string;
  items: Partial<Record<MarketItemId, number>>;
  updatedAt: number;
}

export interface ActiveEffect {
  id: string;
  type: EffectType;
  expiresAt?: number;
  usesLeft?: number;
  sourceUserId?: string;
  meta?: Record<string, string | number | boolean>;
}

export interface UserEffects {
  userId: string;
  activeEffects: ActiveEffect[];
  updatedAt: number;
}

export interface MarketTransaction {
  id: string;
  userId: string;
  itemId: MarketItemId;
  targetUserId?: string;
  actionType: 'buy' | 'use' | 'blocked' | 'reward';
  message: string;
  timestamp: number;
}

export interface WeeklyLeaderboardEntry {
  id: string;
  weekKey: string;
  groupId: string;
  userId: string;
  username: string;
  weeklyPoints: number;
  streak: number;
  completedSessions: number;
}

export interface UserStats {
  userId: string;
  totalWins: number;
  badges: string[];
  lastWinDate?: number;
}
