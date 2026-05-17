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

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    let ok = true;
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      ok = false;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      ok = false;
    }
    return ok;
  };

  const handleSignUp = async () => {
    if (!validate()) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('already been registered')) {
        setEmailError('An account with this email already exists.');
        setAlreadyRegistered(true);
      } else {
        setEmailError(error.message);
      }
      return;
    }
    // Supabase returns identities:[] when the email is already taken (no error thrown)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setEmailError('An account with this email already exists.');
      setAlreadyRegistered(true);
      return;
    }
    if (data.session) {
      router.replace('/(onboarding)/step-1');
    } else {
      router.replace('/(auth)/login');
    }
  };

  const canSubmit = isValidEmail(email) && password.length >= 8;

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
            onPress={() => router.replace('/(auth)/welcome')}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={Colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Create account</Text>

          <GlassCard style={{ gap: 14 }}>
            {/* Email */}
            <View>
              <TextInput
                style={[styles.input, emailError ? styles.inputError : undefined]}
                placeholder="Email"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  setEmailError('');
                  setAlreadyRegistered(false);
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailError ? (
                <View style={styles.errorRow}>
                  <Feather name="alert-circle" size={12} color={Colors.error} />
                  <Text style={styles.errorText}>
                    {emailError}
                    {alreadyRegistered ? (
                      <>
                        {' '}
                        <Text
                          style={styles.errorLink}
                          onPress={() => router.replace('/(auth)/login')}
                        >
                          Log in instead?
                        </Text>
                      </>
                    ) : null}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Password */}
            <View>
              <View>
                <TextInput
                  style={[
                    styles.input,
                    { paddingRight: 46 },
                    passwordError ? styles.inputError : undefined,
                  ]}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    setPasswordError('');
                  }}
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
              {passwordError ? (
                <View style={styles.errorRow}>
                  <Feather name="alert-circle" size={12} color={Colors.error} />
                  <Text style={styles.errorText}>{passwordError}</Text>
                </View>
              ) : null}
            </View>

            <Button
              label="Sign up"
              onPress={handleSignUp}
              variant="primary"
              fullWidth
              loading={loading}
              disabled={!canSubmit}
              style={styles.tallBtn}
            />
          </GlassCard>

          <View style={styles.bottomRow}>
            <Text style={styles.bottomText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.bottomLink}>Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  inputError: {
    borderColor: Colors.error,
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
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    flex: 1,
    lineHeight: 16,
  },
  errorLink: {
    color: Colors.teal.bright,
  },
  tallBtn: { height: 48 },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  bottomText: { fontSize: 13, color: Colors.text.label },
  bottomLink: { fontSize: 13, color: Colors.teal.bright, fontWeight: '500' },
});
