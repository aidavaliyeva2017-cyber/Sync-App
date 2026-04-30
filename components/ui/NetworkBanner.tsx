import React, { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Feather } from '@expo/vector-icons';

interface NetworkBannerProps {
  onRetry?: () => void;
}

export function NetworkBanner({ onRetry }: NetworkBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmountRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = state.isConnected === false && state.isInternetReachable === false;

      if (delayRef.current) clearTimeout(delayRef.current);
      if (unmountRef.current) clearTimeout(unmountRef.current);

      if (offline) {
        delayRef.current = setTimeout(() => {
          setMounted(true);
          setShow(true);
        }, 500);
      } else {
        setShow(false);
        unmountRef.current = setTimeout(() => setMounted(false), 300);
      }
    });

    return () => {
      unsubscribe();
      if (delayRef.current) clearTimeout(delayRef.current);
      if (unmountRef.current) clearTimeout(unmountRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: show ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [show]);

  if (!mounted) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]} pointerEvents={show ? 'auto' : 'none'}>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226,75,74,0.15)',
    borderWidth: 0.5,
    borderColor: 'rgba(226,75,74,0.35)',
    borderRadius: 14,
    marginHorizontal: 12,
    marginBottom: 8,
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
