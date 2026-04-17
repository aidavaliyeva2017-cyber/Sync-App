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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useAuthStore } from '../../stores/authStore';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

function isValidLinkedIn(url: string) {
  return url === '' || /^https?:\/\/(www\.)?linkedin\.com\/in\//.test(url.trim());
}

export default function OnboardingStep5() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const data = useOnboardingStore();
  const { user, setOnboardingComplete } = useAuthStore();

  const [linkedinError, setLinkedinError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleFinish = async () => {
    // Validate optional LinkedIn
    if (data.linkedinUrl && !isValidLinkedIn(data.linkedinUrl)) {
      setLinkedinError('Please enter a valid LinkedIn URL (linkedin.com/in/...)');
      return;
    }

    if (!user) return;
    setLoading(true);

    // Upload avatar if selected
    let avatarUrl: string | null = null;
    if (data.photoUri) {
      const ext = data.photoUri.split('.').pop() ?? 'jpg';
      const path = `${user.id}/profile.${ext}`;
      const response = await fetch(data.photoUri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: `image/${ext}`, upsert: true });
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
    }

    // Insert profile row
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: data.fullName.trim(),
      username: data.username.trim().toLowerCase(),
      avatar_url: avatarUrl,
      age: parseInt(data.age, 10),
      city: data.city.trim(),
      country: data.country,
      major: data.major.trim(),
      university: data.university.trim() || null,
      interests: data.interests as [string, string, string],
      projects: data.projects.trim() || null,
      linkedin_url: data.linkedinUrl.trim() || null,
      connect_preference: data.connectPreference,
      is_verified: false,
      onboarding_complete: true,
    });

    setLoading(false);
    setDone(true);
    setOnboardingComplete(true);
    // Root layout routing guard auto-navigates to (tabs)/home when onboardingComplete becomes true.
  };

  if (done) {
    return (
      <ScreenBackground>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Feather name="check" size={36} color={Colors.teal.bright} />
          </View>
          <Text style={styles.successTitle}>You're all set!</Text>
          <Text style={styles.successBody}>Welcome to Sync. Let's find your people.</Text>
        </View>
      </ScreenBackground>
    );
  }

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
            { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress dots */}
          <View style={styles.dotsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View key={n} style={[styles.dot, n === 5 && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={22} color={Colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Final touches</Text>
          <Text style={styles.subtitle}>Both fields are optional</Text>

          {/* Projects */}
          <Text style={styles.label}>Current projects</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What are you working on?"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={data.projects}
            onChangeText={(t) => data.setField('projects', t)}
            multiline
            textAlignVertical="top"
          />

          {/* LinkedIn */}
          <Text style={[styles.label, { marginTop: 16 }]}>LinkedIn URL</Text>
          <TextInput
            style={[styles.input, linkedinError ? styles.inputError : undefined]}
            placeholder="https://linkedin.com/in/yourhandle"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={data.linkedinUrl}
            onChangeText={(t) => {
              data.setField('linkedinUrl', t);
              setLinkedinError('');
            }}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {linkedinError ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={12} color={Colors.error} />
              <Text style={styles.errorText}>{linkedinError}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={Colors.teal.main} />
            <Text style={styles.loadingText}>Setting up your profile…</Text>
          </View>
        ) : (
          <Button
            label="Finish setup"
            onPress={handleFinish}
            variant="primary"
            fullWidth
            style={styles.tallBtn}
          />
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, flexGrow: 1 },
  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: Colors.teal.main, width: 20, borderRadius: 4 },
  backBtn: { height: 32, justifyContent: 'center', marginBottom: 16 },
  title: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  subtitle: { fontSize: 13, color: Colors.text.body, marginBottom: 28 },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.label,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
  textArea: {
    height: 96,
    paddingTop: 13,
    paddingBottom: 13,
  },
  inputError: { borderColor: Colors.error },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  errorText: { fontSize: 12, color: Colors.error, flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background.base,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  tallBtn: { height: 48 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
  },
  loadingText: { fontSize: 14, color: Colors.text.body },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.teal.verifiedBg,
    borderWidth: 0.5,
    borderColor: Colors.teal.tagBorderAlpha,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.primary,
    marginBottom: 10,
  },
  successBody: {
    fontSize: 14,
    color: Colors.text.body,
    textAlign: 'center',
  },
});
