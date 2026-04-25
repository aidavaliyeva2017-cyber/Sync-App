import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassCard } from '../components/ui/GlassCard';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

export default function ChangeEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = () => {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    if (!newEmail.trim()) {
      setEmailError('Email is required');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      setEmailError('Enter a valid email address');
      valid = false;
    } else if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError('New email must be different from current email');
      valid = false;
    }

    if (!currentPassword) {
      setPasswordError('Current password is required');
      valid = false;
    }

    return valid;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      // Re-authenticate
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user?.email ?? '',
        password: currentPassword,
      });

      if (authError) {
        setPasswordError('Incorrect password');
        setLoading(false);
        return;
      }

      // Update email
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (updateError) {
        setEmailError(updateError.message ?? 'Failed to update email');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScreenBackground>
        <View style={[styles.successContainer, { paddingTop: insets.top }]}>
          <View style={styles.successIconCircle}>
            <Feather name="mail" size={32} color={Colors.teal.main} />
          </View>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successBody}>
            We've sent a confirmation link to{' '}
            <Text style={{ color: Colors.teal.main }}>{newEmail.trim()}</Text>.
            {'\n\n'}Click the link to confirm your new email address.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.primaryBtnText}>Back to settings</Text>
          </TouchableOpacity>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="chevron-left" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.screenTitle}>Change email</Text>
              <Text style={styles.screenSubtitle}>We'll send a confirmation link</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          {/* New email */}
          <Text style={styles.sectionHeader}>NEW EMAIL ADDRESS</Text>
          <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: emailError ? 6 : 20 }}>
            <View style={styles.inputRow}>
              <Feather name="mail" size={16} color={Colors.text.hint} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New email address"
                placeholderTextColor={Colors.text.hint}
                value={newEmail}
                onChangeText={(t) => { setNewEmail(t); setEmailError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>
          </GlassCard>
          {emailError ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={13} color={Colors.error} />
              <Text style={styles.errorText}>{emailError}</Text>
            </View>
          ) : null}

          {/* Current password */}
          <Text style={[styles.sectionHeader, { marginTop: emailError ? 14 : 0 }]}>CURRENT PASSWORD</Text>
          <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: passwordError ? 6 : 28 }}>
            <View style={styles.inputRow}>
              <Feather name="lock" size={16} color={Colors.text.hint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Current password"
                placeholderTextColor={Colors.text.hint}
                value={currentPassword}
                onChangeText={(t) => { setCurrentPassword(t); setPasswordError(''); }}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleUpdate}
              />
              <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={Colors.text.hint} />
              </TouchableOpacity>
            </View>
          </GlassCard>
          {passwordError ? (
            <View style={[styles.errorRow, { marginBottom: 22 }]}>
              <Feather name="alert-circle" size={13} color={Colors.error} />
              <Text style={styles.errorText}>{passwordError}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleUpdate}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.primaryBtnText}>Update email</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  headerCenter: { alignItems: 'center' },
  screenTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  screenSubtitle: {
    fontSize: 12,
    color: Colors.text.hint,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.text.primary,
  },
  eyeBtn: { padding: 4 },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
    paddingLeft: 2,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
  },
  primaryBtn: {
    backgroundColor: Colors.teal.main,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(27,138,143,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(27,138,143,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    color: Colors.text.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
});
