import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { colors } from '../utils/colors';

interface CrownBadgeProps {
  visible?: boolean;
  label?: string;
}

export const CrownBadge: React.FC<CrownBadgeProps> = ({ visible = true, label = 'Weekly Champion' }) => {
  if (!visible) return null;
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>👑 {label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF7DA',
    borderColor: '#F2C94C',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});

