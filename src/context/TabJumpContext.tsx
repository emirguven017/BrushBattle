import React from 'react';

/** App.tsx içindeki alt sekme anahtarları ile aynı */
export type AppTabKey =
  | 'Home'
  | 'Group'
  | 'Leaderboard'
  | 'BrushingMenu'
  | 'BRMarket'
  | 'History'
  | 'Settings';

type TabJumpValue = {
  jumpToTab: (key: AppTabKey) => void;
};

export const TabJumpContext = React.createContext<TabJumpValue | null>(null);

export function useTabJump(): TabJumpValue | null {
  return React.useContext(TabJumpContext);
}
