import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
}

export function GlassCard({ children, style, padding = 16 }: GlassCardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.glass.default,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: Colors.glass.border,
    overflow: 'hidden',
  },
});
