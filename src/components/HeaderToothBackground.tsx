import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type Colors } from '../utils/colors';
import { HEADER_TOOTH_PATTERN } from '../constants/toothPattern';

/** Native stack `headerBackground` — yeşil + üst banttaki diş deseni */
export const HeaderToothBackground: React.FC<{ colors: Colors }> = ({ colors }) => (
  <View style={[styles.fill, { backgroundColor: colors.primary }]}>
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {HEADER_TOOTH_PATTERN.map((item, index) => (
        <MaterialCommunityIcons
          key={`hdr-tooth-${index}`}
          name="tooth-outline"
          size={item.size}
          color="#FFFFFF"
          style={[
            styles.tooth,
            {
              top: item.top,
              left: item.left,
              opacity: 0.3 + (index % 5) * 0.028,
              transform: [{ rotate: item.rotate }],
            },
          ]}
        />
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
  tooth: {
    position: 'absolute',
  },
});
