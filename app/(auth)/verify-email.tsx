import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll every 3 seconds for email confirmation
  useEffect(() => {
    const interval = setInterval(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.email_confirmed_at) {
        clearInterval(interval);
        router.replace('/(onboarding)/step-1');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    await supabase.auth.resend({ type: 'signup', email });
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  return (
    <ScreenBackground>
      <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.iconCircle}>
          <Feather name="mail" size={32} color={Colors.teal.bright} />
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>
          We sent a verification link to
        </Text>
        <Text style={styles.emailText}>{email}</Text>
        <Text style={[styles.body, { marginTop: 8 }]}>
          Click the link in the email to continue.
        </Text>

        <TouchableOpacity
          style={[styles.resendBtn, cooldown > 0 && styles.resendBtnDisabled]}
          onPress={handleResend}
          disabled={cooldown > 0}
          activeOpacity={0.7}
        >
          <Text style={[styles.resendText, cooldown > 0 && styles.resendTextDisabled]}>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.changeEmailBtn}
          onPress={() => router.replace({ pathname: '/(auth)/sign-up', params: { prefillEmail: email } })}
        >
          <Text style={styles.changeEmailText}>Change email</Text>
        </TouchableOpacity>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.teal.verifiedBg,
    borderWidth: 0.5,
    borderColor: Colors.teal.tagBorderAlpha,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: Colors.text.body,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
    marginTop: 4,
  },
  resendBtn: {
    marginTop: 40,
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendBtnDisabled: {
    opacity: 0.45,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.body,
  },
  resendTextDisabled: {
    color: Colors.text.label,
  },
  changeEmailBtn: {
    marginTop: 16,
    padding: 8,
  },
  changeEmailText: {
    fontSize: 13,
    color: Colors.teal.bright,
    fontWeight: '500',
  },
});
