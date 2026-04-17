import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

const PRESET_INTERESTS = [
  'Design',
  'AI / Machine Learning',
  'Startups',
  'Business',
  'Engineering',
  'Data Science',
  'Marketing',
  'Sustainability',
  'Product Management',
  'Computer Science',
  'Finance',
  'Health & Wellness',
];

export default function OnboardingStep4() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { interests, setField } = useOnboardingStore();

  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const toggle = (tag: string) => {
    if (interests.includes(tag)) {
      setField('interests', interests.filter((t) => t !== tag));
    } else if (interests.length < 3) {
      setField('interests', [...interests, tag]);
    }
  };

  const confirmCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed || interests.length >= 3 || interests.includes(trimmed)) return;
    setField('interests', [...interests, trimmed]);
    setCustomInput('');
    setShowCustomInput(false);
  };

  const canContinue = interests.length === 3;

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <View key={n} style={[styles.dot, n === 4 && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="chevron-left" size={22} color={Colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Your interests</Text>
            <Text style={styles.subtitle}>Select exactly 3</Text>
          </View>
          <Text style={[styles.counter, interests.length === 3 && styles.counterFull]}>
            {interests.length}/3
          </Text>
        </View>

        {interests.length < 3 ? (
          <Text style={styles.helperText}>
            {3 - interests.length} more to go
          </Text>
        ) : (
          <Text style={[styles.helperText, { color: Colors.teal.bright }]}>
            All 3 selected — tap to deselect
          </Text>
        )}

        <View style={styles.tagsWrap}>
          {PRESET_INTERESTS.map((tag) => {
            const selected = interests.includes(tag);
            const disabled = !selected && interests.length >= 3;
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => toggle(tag)}
                disabled={disabled}
                activeOpacity={0.7}
                style={[
                  styles.tag,
                  selected && styles.tagSelected,
                  disabled && styles.tagDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    selected && styles.tagTextSelected,
                    disabled && styles.tagTextDisabled,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Custom interests already added */}
          {interests
            .filter((t) => !PRESET_INTERESTS.includes(t))
            .map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => toggle(tag)}
                activeOpacity={0.7}
                style={[styles.tag, styles.tagSelected]}
              >
                <Text style={[styles.tagText, styles.tagTextSelected]}>{tag}</Text>
              </TouchableOpacity>
            ))}

          {/* + Custom button */}
          {interests.length < 3 && !showCustomInput && (
            <TouchableOpacity
              onPress={() => setShowCustomInput(true)}
              activeOpacity={0.7}
              style={[styles.tag, styles.tagCustom]}
            >
              <Feather name="plus" size={12} color={Colors.teal.bright} />
              <Text style={styles.tagCustomText}>Custom</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Custom interest input */}
        {showCustomInput && (
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              placeholder="Type a custom interest"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={customInput}
              onChangeText={setCustomInput}
              autoFocus
              onSubmitEditing={confirmCustom}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={confirmCustom}
              style={styles.customConfirm}
              disabled={!customInput.trim()}
            >
              <Feather
                name="check"
                size={18}
                color={customInput.trim() ? Colors.teal.bright : Colors.text.hint}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setShowCustomInput(false); setCustomInput(''); }}
              style={styles.customConfirm}
            >
              <Feather name="x" size={18} color={Colors.text.label} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {!canContinue && (
          <Text style={styles.footerHint}>Select 3 interests to continue</Text>
        )}
        <Button
          label="Next"
          onPress={() => router.push('/(onboarding)/step-5')}
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.primary,
    marginBottom: 4,
  },
  subtitle: { fontSize: 13, color: Colors.text.body },
  counter: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text.label,
    marginTop: 4,
  },
  counterFull: { color: Colors.teal.bright },
  helperText: {
    fontSize: 12,
    color: Colors.text.label,
    marginBottom: 20,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tagSelected: {
    backgroundColor: Colors.teal.tagBgAlpha,
    borderColor: Colors.teal.tagBorderAlpha,
  },
  tagDisabled: {
    opacity: 0.35,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text.body,
  },
  tagTextSelected: {
    color: Colors.teal.light,
  },
  tagTextDisabled: {
    color: Colors.text.hint,
  },
  tagCustom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderColor: Colors.teal.tagBorderAlpha,
    borderStyle: 'dashed',
  },
  tagCustomText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.teal.bright,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#FFFFFF',
  },
  customConfirm: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 10,
    backgroundColor: Colors.background.base,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.06)',
    gap: 6,
  },
  footerHint: {
    fontSize: 12,
    color: Colors.text.label,
    textAlign: 'center',
  },
  tallBtn: { height: 48 },
});
