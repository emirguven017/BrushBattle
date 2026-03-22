import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../utils/colors';

interface TimerCircleProps {
  remaining: number;
  total: number;
  label?: string;
}

const SIZE = 200;
const STROKE_WIDTH = 10;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CENTER = SIZE / 2;

/** Circular countdown timer: beyaz gölgeli halka başlangıçta, vakit geçtikçe yeşil dolum */
export const TimerCircle: React.FC<TimerCircleProps> = ({
  remaining,
  total,
  label = 'Keep brushing!'
}) => {
  const progress = total > 0 ? (total - remaining) / total : 1;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  const ringColor = progress >= 1 ? colors.success : colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.circleWrapper, styles.shadowRing]}>
        <Svg width={SIZE} height={SIZE} style={styles.svg}>
          {/* Beyaz arka plan halkası (track) */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke="#ffffff"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Yeşil halka (sabit, animasyonsuz) */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={ringColor}
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
        </Svg>
        <View style={styles.timerContent}>
          <Text style={styles.timerText}>{`${m}:${s.toString().padStart(2, '0')}`}</Text>
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.min(100, progress * 100)}%` }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 24 },
  circleWrapper: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowRing: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  svg: {
    position: 'absolute',
  },
  timerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: { fontSize: 48, fontWeight: '800', color: colors.primary },
  label: { fontSize: 18, color: colors.muted, marginTop: 16, fontWeight: '600' },
  progressBar: {
    width: 200,
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4
  }
});
