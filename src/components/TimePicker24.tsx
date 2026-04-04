import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';

interface TimePicker24Props {
  value: string;
  onChange: (time: string) => void;
}

const pad = (n: number) => n.toString().padStart(2, '0');

export const TimePicker24: React.FC<TimePicker24Props> = ({ value, onChange }) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [h, m] = value.split(':').map((x) => parseInt(x, 10) || 0);
  const hour = Math.min(23, Math.max(0, h));
  const minute = Math.min(59, Math.max(0, m));

  const setHour = (v: number) => {
    const newH = ((v % 24) + 24) % 24;
    onChange(`${pad(newH)}:${pad(minute)}`);
  };

  const setMinute = (v: number) => {
    const newM = ((v % 60) + 60) % 60;
    onChange(`${pad(hour)}:${pad(newM)}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.column}>
        <TouchableOpacity
          style={styles.arrow}
          onPress={() => setHour(hour + 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.arrowText}>▲</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{pad(hour)}</Text>
        <TouchableOpacity
          style={styles.arrow}
          onPress={() => setHour(hour - 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.separator}>:</Text>

      <View style={styles.column}>
        <TouchableOpacity
          style={styles.arrow}
          onPress={() => setMinute(minute + 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.arrowText}>▲</Text>
        </TouchableOpacity>
        <Text style={styles.value}>{pad(minute)}</Text>
        <TouchableOpacity
          style={styles.arrow}
          onPress={() => setMinute(minute - 1)}
          activeOpacity={0.7}
        >
          <Text style={styles.arrowText}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8
  },
  column: {
    alignItems: 'center',
    minWidth: 56
  },
  arrow: {
    padding: 12,
    paddingVertical: 8
  },
  arrowText: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700'
  },
  value: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums']
  },
  separator: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primary,
    marginHorizontal: 4
  }
});
