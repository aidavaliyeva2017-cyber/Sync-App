import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ScreenBackground } from '../../components/ScreenBackground';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);
  const [comingSoon, setComingSoon] = useState('');

  const showComingSoon = (msg: string) => {
    setComingSoon(msg);
    setTimeout(() => setComingSoon(''), 2500);
  };

  const handleLogin = async () => {
    setAuthError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setAuthError('Incorrect email or password');
    }
    // On success: onAuthStateChange in _layout.tsx fires, routing guard redirects
  };

  const handleOAuth = (provider: 'google' | 'apple') => {
    showComingSoon(
      provider === 'google' ? 'Google sign-in coming soon' : 'Apple sign-in coming soon'
    );
  };

  const canSubmit = isValidEmail(email) && password.length > 0;

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 42, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Welcome back</Text>

          <GlassCard style={{ gap: 14 }}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={email}
              onChangeText={(t) => { setEmail(t); setAuthError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View>
              <TextInput
                style={[styles.input, { paddingRight: 46 }]}
                placeholder="Password"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={password}
                onChangeText={(t) => { setPassword(t); setAuthError(''); }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={16}
                  color={Colors.text.label}
                />
              </TouchableOpacity>
            </View>

            {authError ? (
              <View style={styles.errorRow}>
                <Feather name="alert-circle" size={12} color={Colors.error} />
                <Text style={styles.errorText}>{authError}</Text>
              </View>
            ) : null}

            <Button
              label="Log in"
              onPress={handleLogin}
              variant="primary"
              fullWidth
              loading={loading}
              disabled={!canSubmit}
              style={styles.tallBtn}
            />

            <TouchableOpacity
              style={styles.forgotRow}
              onPress={() => router.push('/(auth)/forgot-password')}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </GlassCard>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.socialBtn}
            onPress={() => handleOAuth('google')}
            activeOpacity={0.7}
          >
            <Feather name="globe" size={18} color={Colors.text.body} />
            <Text style={styles.socialBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, { marginTop: 10 }]}
            onPress={() => handleOAuth('apple')}
            activeOpacity={0.7}
          >
            <Feather name="smartphone" size={18} color={Colors.text.body} />
            <Text style={styles.socialBtnText}>Continue with Apple</Text>
          </TouchableOpacity>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-up')}>
              <Text style={styles.bottomLink}>Create one</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {comingSoon ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{comingSoon}</Text>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  backBtn: { height: 36, justifyContent: 'center', marginBottom: 16 },
  title: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.primary,
    marginBottom: 24,
  },
  input: {
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#FFFFFF',
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: -4,
  },
  errorText: { fontSize: 12, color: Colors.error, flex: 1 },
  tallBtn: { height: 48 },
  forgotRow: { alignItems: 'center' },
  forgotText: { fontSize: 13, color: Colors.teal.bright, fontWeight: '500' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: Colors.glass.divider,
  },
  dividerText: { fontSize: 12, color: Colors.text.label },
  socialBtn: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.ghost.bg,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.ghost.border,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.body,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  bottomText: { fontSize: 13, color: Colors.text.label },
  bottomLink: { fontSize: 13, color: Colors.teal.bright, fontWeight: '500' },
  toast: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,30,40,0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: { fontSize: 13, color: Colors.text.body, fontWeight: '500' },
});
