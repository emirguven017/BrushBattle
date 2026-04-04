import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { type Colors } from '../utils/colors';
import { useColors } from '../context/ThemeContext';

type PrettyModalVariant = 'info' | 'warning';

interface PrettyModalProps {
  visible: boolean;
  title: string;
  message: string;
  primaryText: string;
  onPrimary: () => void;
  onClose: () => void;
  variant?: PrettyModalVariant;
}

export const PrettyModal: React.FC<PrettyModalProps> = ({
  visible,
  title,
  message,
  primaryText,
  onPrimary,
  onClose,
  variant = 'info',
}) => {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const icon = variant === 'warning' ? '⏳' : 'ℹ️';
  const tint = variant === 'warning' ? colors.warning : colors.primary;
  const tintBg = variant === 'warning' ? colors.warningLight : colors.successLight;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <View style={[styles.iconWrap, { backgroundColor: tintBg }]}>
            <Text style={[styles.icon, { color: tint }]}>{icon}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: tint }]}
            onPress={onPrimary}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryText}>{primaryText}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const createStyles = (colors: Colors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  icon: { fontSize: 26 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
