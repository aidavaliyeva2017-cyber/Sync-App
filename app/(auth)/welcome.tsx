import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.wordmark}>Sync</Text>
          <Text style={styles.tagline}>Purposeful student networking</Text>
        </View>
        <View style={[styles.buttons, { paddingBottom: insets.bottom + 24 }]}>
          <Button
            label="Create account"
            onPress={() => router.push('/(auth)/sign-up')}
            variant="primary"
            fullWidth
            style={styles.tallBtn}
          />
          <Button
            label="Log in"
            onPress={() => router.push('/(auth)/login')}
            variant="ghost"
            fullWidth
            style={styles.tallBtn}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: Typography.size.wordmark,
    fontWeight: Typography.weight.wordmark,
    color: Colors.text.primary,
    letterSpacing: Typography.letterSpacing.wordmark,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.text.label,
  },
  buttons: {
    gap: 12,
  },
  tallBtn: {
    height: 48,
  },
});
