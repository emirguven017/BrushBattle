import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '../context/ThemeContext';
import { TOOTH_PATTERN } from '../constants/toothPattern';

interface BrandedScreenBackgroundProps {
  children: React.ReactNode;
  /** Dış container (flex:1 önerilir) */
  style?: StyleProp<ViewStyle>;
  /** Diş pattern’i gösterme (ör. tam ekran video) */
  showPattern?: boolean;
}

/**
 * Yeşil marka zemini + beyaz %50 opacity diş deseni. Tüm ana ekranlarda ortak şablon.
 */
export const BrandedScreenBackground: React.FC<BrandedScreenBackgroundProps> = ({
  children,
  style,
  showPattern = true,
}) => {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: colors.primary }, style]}>
      {showPattern ? (
        <>
          <View pointerEvents="none" style={styles.toothLayer}>
            {TOOTH_PATTERN.map((item, index) => (
              <MaterialCommunityIcons
                key={`tooth-bg-${index}`}
                name="tooth-outline"
                size={item.size}
                color="#FFFFFF"
                style={[
                  styles.toothIcon,
                  {
                    top: item.top,
                    left: item.left,
                    opacity: toothOpacityForIndex(index),
                    transform: [{ rotate: item.rotate }],
                  },
                ]}
              />
            ))}
          </View>
          <View pointerEvents="none" style={styles.vignetteTop} />
          <View pointerEvents="none" style={styles.vignetteBottom} />
        </>
      ) : null}
      {children}
    </View>
  );
};

/** Hafif derinlik: dişlerde tekdüze opaklık yerine çeşitlilik */
function toothOpacityForIndex(index: number): number {
  return 0.26 + (index % 6) * 0.028;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  toothLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  toothIcon: {
    position: 'absolute',
  },
  /** Üstte hafif aydınlık, altta hafif gölge — düz yeşili yumuşatır */
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  vignetteBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '38%',
    backgroundColor: 'rgba(0,0,0,0.07)',
  },
});
