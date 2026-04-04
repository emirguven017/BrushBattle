import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { type Colors } from '../../utils/colors';
import { useColors } from '../../context/ThemeContext';
import type { ZoneIndex } from '../../utils/brushingZones';
import { useLanguage } from '../../context/LanguageContext';

const ZONE_KEYS: Record<ZoneIndex, string> = {
  0: 'zoneUR',
  1: 'zoneLR',
  2: 'zoneUL',
  3: 'zoneLL',
};

interface InstructionTextProps {
  zone: ZoneIndex;
}

export const InstructionText: React.FC<InstructionTextProps> = ({ zone }) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useLanguage();
  return <Text style={styles.text}>{t(ZONE_KEYS[zone])}</Text>;
};

const createStyles = (colors: Colors) => StyleSheet.create({
  text: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 26,
  },
});
