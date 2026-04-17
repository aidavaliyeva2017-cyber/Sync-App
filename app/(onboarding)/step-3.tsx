import React from 'react';
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
import { ScreenBackground } from '../../components/ScreenBackground';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function OnboardingStep3() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { major, university, setField } = useOnboardingStore();

  const canContinue = major.trim().length > 0;

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
              <View key={n} style={[styles.dot, n === 3 && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={22} color={Colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>Academic info</Text>
          <Text style={styles.subtitle}>What are you studying?</Text>

          {/* Major */}
          <Text style={styles.label}>Major / Field of study</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Science"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={major}
            onChangeText={(t) => setField('major', t)}
            autoCapitalize="words"
          />

          {/* University */}
          <Text style={[styles.label, { marginTop: 16 }]}>
            University{' '}
            <Text style={styles.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. TU Munich"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={university}
            onChangeText={(t) => setField('university', t)}
            autoCapitalize="words"
          />
          <Text style={styles.hint}>
            Add your university to connect with students at your institution.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Next"
          onPress={() => router.push('/(onboarding)/step-4')}
          variant="primary"
          fullWidth
          disabled={!canContinue}
          style={styles.tallBtn}
        />
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
  optional: {
    fontWeight: '400',
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 11,
    color: Colors.text.hint,
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
  hint: {
    fontSize: 12,
    color: Colors.text.hint,
    marginTop: 8,
    lineHeight: 17,
  },
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
});
