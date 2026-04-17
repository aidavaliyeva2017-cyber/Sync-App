import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDismiss: () => void;
  duration?: number;
}

const ICON_MAP: Record<ToastType, keyof typeof Feather.glyphMap> = {
  success: 'check-circle',
  error: 'alert-circle',
  info: 'info',
};

const COLOR_MAP: Record<ToastType, string> = {
  success: Colors.teal.bright,
  error: Colors.error,
  info: Colors.text.body,
};

export function Toast({
  visible,
  message,
  type = 'info',
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  function dismiss() {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onDismiss());
  }

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        { top: insets.top + 12 },
        { transform: [{ translateY }], opacity },
      ]}
    >
      <View style={styles.content}>
        <Feather
          name={ICON_MAP[type]}
          size={16}
          color={COLOR_MAP[type]}
          style={styles.icon}
        />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={14} color={Colors.text.label} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background.raised,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.glass.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    marginRight: 10,
  },
  message: {
    flex: 1,
    color: Colors.text.body,
    fontSize: Typography.size.body,
    fontWeight: Typography.weight.body,
    lineHeight: Typography.size.body * Typography.lineHeight.body,
    marginRight: 8,
  },
});
