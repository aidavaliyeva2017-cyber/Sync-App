import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface NetworkBannerProps {
  visible: boolean;
  onRetry?: () => void;
}

export function NetworkBanner({ visible, onRetry }: NetworkBannerProps) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : -80,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View
      style={[
        styles.banner,
        { top: insets.top + 8, transform: [{ translateY }] },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Feather name="wifi-off" size={14} color="#E24B4A" style={{ marginRight: 8 }} />
      <Text style={styles.text}>No internet connection</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.retryBtn} activeOpacity={0.7}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226,75,74,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(226,75,74,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#E24B4A',
  },
  retryBtn: {
    backgroundColor: 'rgba(226,75,74,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E24B4A',
  },
});
