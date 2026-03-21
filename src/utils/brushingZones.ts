/** Zone index: 0=upper-left, 1=upper-right, 2=lower-left, 3=lower-right */
export type ZoneIndex = 0 | 1 | 2 | 3;

export const ZONE_NAMES: Record<ZoneIndex, string> = {
  0: 'Sol üst dişleri fırçala',
  1: 'Sağ üst dişlere geç',
  2: 'Şimdi sol alt dişleri fırçala',
  3: 'Sağ alt dişlerle bitir',
};

export const ZONE_DURATION_SEC = 30;
export const TOTAL_DURATION_SEC = 120;

export const getZoneFromElapsed = (elapsedSec: number): ZoneIndex => {
  if (elapsedSec < 30) return 0;
  if (elapsedSec < 60) return 1;
  if (elapsedSec < 90) return 2;
  return 3;
};
