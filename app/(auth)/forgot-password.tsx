import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    setSent(true);
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.container,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 },
          ]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Reset password</Text>

          {!sent ? (
            <>
              <Text style={styles.body}>
                Enter your email and we'll send you a link to reset your password.
              </Text>

              <TextInput
                style={[styles.input, emailError ? styles.inputError : undefined, { marginTop: 24 }]}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={(t) => { setEmail(t); setEmailError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError ? (
                <View style={styles.errorRow}>
                  <Feather name="alert-circle" size={12} color={Colors.error} />
                  <Text style={styles.errorText}>{emailError}</Text>
                </View>
              ) : null}

              <Button
                label="Send reset link"
                onPress={handleSubmit}
                variant="primary"
                fullWidth
                loading={loading}
                disabled={!isValidEmail(email)}
                style={[styles.tallBtn, { marginTop: 16 }]}
              />
            </>
          ) : (
            <View style={styles.sentContainer}>
              <View style={styles.iconCircle}>
                <Feather name="check" size={28} color={Colors.teal.bright} />
              </View>
              <Text style={styles.sentTitle}>Check your email</Text>
              <Text style={styles.body}>
                We sent a password reset link to{'\n'}
                <Text style={styles.emailText}>{email}</Text>
              </Text>
              <TouchableOpacity
                style={{ marginTop: 32 }}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.backToLogin}>Back to log in</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 20 },
  backBtn: { height: 36, justifyContent: 'center', marginBottom: 16 },
  title: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.primary,
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: Colors.text.body,
    lineHeight: 20,
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
  inputError: { borderColor: Colors.error },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  errorText: { fontSize: 12, color: Colors.error, flex: 1 },
  tallBtn: { height: 48 },
  sentContainer: { flex: 1, alignItems: 'center', paddingTop: 40 },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.teal.verifiedBg,
    borderWidth: 0.5,
    borderColor: Colors.teal.tagBorderAlpha,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  sentTitle: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.primary,
    marginBottom: 10,
  },
  emailText: { fontWeight: '600', color: Colors.text.primary },
  backToLogin: { fontSize: 14, color: Colors.teal.bright, fontWeight: '500' },
});
