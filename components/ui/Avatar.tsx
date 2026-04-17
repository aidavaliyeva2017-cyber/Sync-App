import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface AvatarProps {
  size?: number;
  imageUrl?: string | null;
  name?: string;
  variant?: 'teal' | 'rose';
  style?: ViewStyle;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({
  size = 44,
  imageUrl,
  name = '',
  variant = 'teal',
  style,
}: AvatarProps) {
  const fontSize = Math.round(size * 0.36);
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    overflow: 'hidden',
  };

  if (imageUrl) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </View>
    );
  }

  const initials = getInitials(name);

  if (variant === 'rose') {
    return (
      <View
        style={[
          containerStyle,
          { backgroundColor: Colors.rose.avatarBgAlpha },
          style,
        ]}
      >
        <View style={styles.initialsContainer}>
          <Text style={[styles.initials, { fontSize, color: Colors.rose.soft }]}>
            {initials}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[Colors.teal.main, Colors.teal.bright]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[containerStyle, style]}
    >
      <View style={styles.initialsContainer}>
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  initialsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
