import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/colors';

interface ScreenBackgroundProps {
  children: React.ReactNode;
  reducedGlows?: boolean;
}

export function ScreenBackground({ children }: ScreenBackgroundProps) {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(20,40,45,1)', 'rgba(25,15,28,1)', 'rgba(12,12,18,1)', 'rgba(10,10,15,1)']}
        locations={[0, 0.38, 0.58, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.base,
  },
  content: {
    flex: 1,
  },
});
