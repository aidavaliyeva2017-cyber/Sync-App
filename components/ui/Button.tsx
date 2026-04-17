import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

type ButtonVariant = 'primary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  fullWidth = false,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary ? '#FFFFFF' : Colors.text.body}
        />
      ) : (
        <Text style={[styles.label, !isPrimary && styles.ghostLabel]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: Colors.teal.main,
  },
  ghost: {
    backgroundColor: Colors.ghost.bg,
    borderWidth: 0.5,
    borderColor: Colors.ghost.border,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: Typography.size.button,
    fontWeight: Typography.weight.button,
    color: '#FFFFFF',
  },
  ghostLabel: {
    color: Colors.text.body,
  },
});
