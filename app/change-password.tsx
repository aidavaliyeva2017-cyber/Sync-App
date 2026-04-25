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

function getStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

const STRENGTH_LABELS: Record<number, string> = {
  0: '',
  1: 'Weak',
  2: 'Fair',
  3: 'Fair',
  4: 'Strong',
  5: 'Strong',
};

const STRENGTH_COLORS: Record<number, string> = {
  0: 'rgba(255,255,255,0.1)',
  1: '#E24B4A',
  2: '#E88FB5',
  3: '#E88FB5',
  4: '#3AAFB5',
  5: '#3AAFB5',
};

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [currentError, setCurrentError] = useState('');
  const [newError, setNewError] = useState('');
  const [confirmError, setConfirmError] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getStrength(newPassword);
  const strengthColor = STRENGTH_COLORS[strength];
  const strengthLabel = STRENGTH_LABELS[strength];
  const confirmMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const validate = () => {
    let valid = true;
    setCurrentError('');
    setNewError('');
    setConfirmError('');

    if (!currentPassword) {
      setCurrentError('Current password is required');
      valid = false;
    }
    if (!newPassword) {
      setNewError('New password is required');
      valid = false;
    } else if (newPassword.length < 8) {
      setNewError('Password must be at least 8 characters');
      valid = false;
    } else if (newPassword === currentPassword) {
      setNewError('New password must be different from current');
      valid = false;
    }
    if (!confirmPassword) {
      setConfirmError('Please confirm your new password');
      valid = false;
    } else if (newPassword !== confirmPassword) {
      setConfirmError('Passwords do not match');
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
        setCurrentError('Incorrect password');
        setLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setNewError(updateError.message ?? 'Failed to update password');
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setNewError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <ScreenBackground>
        <View style={[styles.successContainer, { paddingTop: insets.top }]}>
          <View style={styles.successIconCircle}>
            <Feather name="check" size={32} color={Colors.teal.main} />
          </View>
          <Text style={styles.successTitle}>Password updated</Text>
          <Text style={styles.successBody}>
            Your password has been changed successfully.{'\n'}
            Use your new password the next time you log in.
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
              <Text style={styles.screenTitle}>Change password</Text>
              <Text style={styles.screenSubtitle}>Keep your account secure</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>

          {/* Current password */}
          <Text style={styles.sectionHeader}>CURRENT PASSWORD</Text>
          <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: currentError ? 6 : 20 }}>
            <View style={styles.inputRow}>
              <Feather name="lock" size={16} color={Colors.text.hint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Current password"
                placeholderTextColor={Colors.text.hint}
                value={currentPassword}
                onChangeText={(t) => { setCurrentPassword(t); setCurrentError(''); }}
                secureTextEntry={!showCurrent}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowCurrent(v => !v)} style={styles.eyeBtn}>
                <Feather name={showCurrent ? 'eye-off' : 'eye'} size={16} color={Colors.text.hint} />
              </TouchableOpacity>
            </View>
          </GlassCard>
          {currentError ? <ErrorRow message={currentError} /> : null}

          {/* New password */}
          <Text style={[styles.sectionHeader, { marginTop: currentError ? 14 : 0 }]}>NEW PASSWORD</Text>
          <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: 10 }}>
            <View style={styles.inputRow}>
              <Feather name="key" size={16} color={Colors.text.hint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="New password"
                placeholderTextColor={Colors.text.hint}
                value={newPassword}
                onChangeText={(t) => { setNewPassword(t); setNewError(''); }}
                secureTextEntry={!showNew}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowNew(v => !v)} style={styles.eyeBtn}>
                <Feather name={showNew ? 'eye-off' : 'eye'} size={16} color={Colors.text.hint} />
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Strength bar */}
          {newPassword.length > 0 && (
            <View style={[styles.strengthWrap, { marginBottom: newError ? 6 : 20 }]}>
              <View style={styles.strengthBars}>
                {[1, 2, 3, 4, 5].map((bar) => (
                  <View
                    key={bar}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: bar <= strength ? strengthColor : 'rgba(255,255,255,0.1)' },
                    ]}
                  />
                ))}
              </View>
              {strengthLabel ? (
                <Text style={[styles.strengthLabel, { color: strengthColor }]}>{strengthLabel}</Text>
              ) : null}
            </View>
          )}
          {newError ? <ErrorRow message={newError} /> : null}

          {/* Confirm password */}
          <Text style={[styles.sectionHeader, { marginTop: newError ? 14 : newPassword.length === 0 ? 0 : 0 }]}>
            CONFIRM NEW PASSWORD
          </Text>
          <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: confirmError ? 6 : 28 }}>
            <View style={styles.inputRow}>
              <Feather name="check-circle" size={16} color={Colors.text.hint} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.text.hint}
                value={confirmPassword}
                onChangeText={(t) => { setConfirmPassword(t); setConfirmError(''); }}
                secureTextEntry={!showConfirm}
                returnKeyType="done"
                onSubmitEditing={handleUpdate}
              />
              {confirmMatch ? (
                <Feather name="check-circle" size={16} color="#3AAFB5" style={{ marginLeft: 8 }} />
              ) : (
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                  <Feather name={showConfirm ? 'eye-off' : 'eye'} size={16} color={Colors.text.hint} />
                </TouchableOpacity>
              )}
            </View>
          </GlassCard>
          {confirmError ? <ErrorRow message={confirmError} /> : null}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleUpdate}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.primaryBtnText}>Update password</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

function ErrorRow({ message }: { message: string }) {
  return (
    <View style={styles.errorRow}>
      <Feather name="alert-circle" size={13} color={Colors.error} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
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
  strengthWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 2,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    width: 32,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: Colors.teal.main,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
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
