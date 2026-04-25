import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.14] });

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius, backgroundColor: '#FFFFFF', opacity }, style]}
    />
  );
}

// Match card skeleton — content only, no card wrapper (placed inside GlassCard)
export function SkeletonMatchCard() {
  return (
    <View>
      <View style={styles.row}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.infoCol}>
          <Skeleton width="60%" height={14} borderRadius={7} />
          <View style={{ height: 6 }} />
          <Skeleton width="40%" height={11} borderRadius={5} />
        </View>
      </View>
      <View style={[styles.tagsRow, { marginTop: 12 }]}>
        <Skeleton width={60} height={22} borderRadius={11} />
        <Skeleton width={50} height={22} borderRadius={11} />
        <Skeleton width={70} height={22} borderRadius={11} />
      </View>
      <Skeleton width="100%" height={36} borderRadius={10} style={{ marginTop: 12 }} />
    </View>
  );
}

// Student card skeleton — matches the Discover screen card shape
export function SkeletonStudentCard() {
  return (
    <View style={[styles.card, { marginBottom: 10 }]}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} borderRadius={22} />
        <View style={styles.infoCol}>
          <Skeleton width="55%" height={14} borderRadius={7} />
          <View style={{ height: 6 }} />
          <Skeleton width="70%" height={11} borderRadius={5} />
        </View>
      </View>
      <View style={[styles.tagsRow, { marginTop: 10 }]}>
        <Skeleton width={55} height={20} borderRadius={10} />
        <Skeleton width={65} height={20} borderRadius={10} />
        <Skeleton width={45} height={20} borderRadius={10} />
      </View>
      <View style={[styles.row, { marginTop: 10, gap: 8 }]}>
        <Skeleton width="48%" height={34} borderRadius={10} />
        <Skeleton width="48%" height={34} borderRadius={10} />
      </View>
    </View>
  );
}

// Chat list row skeleton
export function SkeletonChatRow() {
  return (
    <View style={styles.chatRow}>
      <Skeleton width={38} height={38} borderRadius={19} />
      <View style={styles.chatInfo}>
        <Skeleton width="45%" height={13} borderRadius={6} />
        <View style={{ height: 5 }} />
        <Skeleton width="65%" height={10} borderRadius={5} />
      </View>
      <Skeleton width={22} height={9} borderRadius={4} />
    </View>
  );
}

// Profile skeleton — avatar circle + lines
export function SkeletonProfile() {
  return (
    <View style={styles.profileWrap}>
      <Skeleton width={80} height={80} borderRadius={40} style={{ alignSelf: 'center' }} />
      <View style={{ height: 14 }} />
      <Skeleton width={140} height={18} borderRadius={9} style={{ alignSelf: 'center' }} />
      <View style={{ height: 8 }} />
      <Skeleton width={90} height={12} borderRadius={6} style={{ alignSelf: 'center' }} />
      <View style={{ height: 4 }} />
      <Skeleton width={110} height={11} borderRadius={5} style={{ alignSelf: 'center' }} />
    </View>
  );
}

// Message bubble skeleton
export function SkeletonMessageBubble({ mine }: { mine?: boolean }) {
  return (
    <View style={[styles.bubbleWrap, mine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }]}>
      <Skeleton
        width={160 + Math.round(Math.random() * 60)}
        height={36}
        borderRadius={16}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 14,
    marginBottom: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoCol: { flex: 1 },
  tagsRow: { flexDirection: 'row', gap: 6 },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  chatInfo: { flex: 1 },
  profileWrap: { paddingVertical: 8 },
  bubbleWrap: { marginTop: 12, marginHorizontal: 14 },
});
