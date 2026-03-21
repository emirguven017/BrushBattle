import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../utils/colors';

interface TimerCircleProps {
  remaining: number;
  total: number;
  label?: string;
}

/** Circular-style countdown timer (large circle with progress feel) */
export const TimerCircle: React.FC<TimerCircleProps> = ({
  remaining,
  total,
  label = 'Keep brushing!'
}) => {
  const progress = total > 0 ? (total - remaining) / total : 1;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <View style={styles.container}>
      <View style={styles.circleOuter}>
        <View
          style={[
            styles.circleInner,
            { borderColor: progress >= 1 ? colors.success : colors.primary }
          ]}
        >
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
  circleOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  circleInner: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center'
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
