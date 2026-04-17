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
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { COUNTRIES } from '../../constants/countries';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

export default function OnboardingStep2() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { age, city, country, connectPreference, setField } = useOnboardingStore();

  const [ageError, setAgeError] = useState('');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter((c) =>
        c.name.toLowerCase().includes(countrySearch.toLowerCase())
      )
    : COUNTRIES;

  const handleAgeChange = (text: string) => {
    setField('age', text.replace(/[^0-9]/g, ''));
    if (parseInt(text, 10) < 16 && text.length > 0) {
      setAgeError('You must be at least 16 to use Sync');
    } else {
      setAgeError('');
    }
  };

  const ageNum = parseInt(age, 10);
  const canContinue =
    age.length > 0 &&
    !isNaN(ageNum) &&
    ageNum >= 16 &&
    city.trim().length > 0 &&
    country.trim().length > 0;

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
              <View key={n} style={[styles.dot, n === 2 && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={22} color={Colors.text.primary} />
          </TouchableOpacity>

          <Text style={styles.title}>About you</Text>
          <Text style={styles.subtitle}>Help others find you on campus</Text>

          {/* Age */}
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={[styles.input, ageError ? styles.inputError : undefined]}
            placeholder="Your age"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={age}
            onChangeText={handleAgeChange}
            keyboardType="number-pad"
            maxLength={3}
          />
          {ageError ? (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={12} color={Colors.error} />
              <Text style={styles.errorText}>{ageError}</Text>
            </View>
          ) : null}

          {/* City */}
          <Text style={[styles.label, { marginTop: 16 }]}>City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Munich"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={city}
            onChangeText={(t) => setField('city', t)}
            autoCapitalize="words"
          />

          {/* Connect preference */}
          <Text style={[styles.label, { marginTop: 16 }]}>How do you prefer to connect?</Text>
          <View style={styles.prefRow}>
            {(['in-person', 'online', 'both'] as const).map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.prefPill, connectPreference === opt && styles.prefPillActive]}
                onPress={() => setField('connectPreference', opt)}
                activeOpacity={0.7}
              >
                <Text style={[styles.prefPillText, connectPreference === opt && styles.prefPillTextActive]}>
                  {opt === 'in-person' ? 'In-person' : opt === 'online' ? 'Online' : 'Both'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Country */}
          <Text style={[styles.label, { marginTop: 16 }]}>Country</Text>
          <TouchableOpacity
            style={[styles.input, styles.pickerRow]}
            onPress={() => setShowCountryPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={country ? styles.pickerText : styles.pickerPlaceholder}>
              {country || 'Select country'}
            </Text>
            <Feather name="chevron-down" size={16} color={Colors.text.label} />
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Next button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Next"
          onPress={() => router.push('/(onboarding)/step-3')}
          variant="primary"
          fullWidth
          disabled={!canContinue}
          style={styles.tallBtn}
        />
      </View>

      {/* Country picker modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCountryPicker(false)}
        />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select country</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search countries..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={countrySearch}
            onChangeText={setCountrySearch}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
          />
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryItem, item.name === country && styles.countryItemActive]}
                onPress={() => {
                  setField('country', item.name);
                  setCountrySearch('');
                  setShowCountryPicker(false);
                }}
              >
                <Text style={[styles.countryText, item.name === country && styles.countryTextActive]}>
                  {item.name}
                </Text>
                {item.name === country && (
                  <Feather name="check" size={16} color={Colors.teal.bright} />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
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
  inputError: { borderColor: Colors.error },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  errorText: { fontSize: 12, color: Colors.error, flex: 1 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { fontSize: 14, color: '#FFFFFF' },
  pickerPlaceholder: { fontSize: 14, color: 'rgba(255,255,255,0.3)' },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalSheet: {
    backgroundColor: Colors.background.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 10,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.glass.divider,
  },
  countryItemActive: {},
  countryText: { fontSize: 15, color: Colors.text.body },
  countryTextActive: { color: Colors.text.primary, fontWeight: '500' },
  prefRow: { flexDirection: 'row', gap: 8 },
  prefPill: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefPillActive: {
    backgroundColor: 'rgba(27,138,143,0.25)',
    borderColor: Colors.teal.tagBorderAlpha,
  },
  prefPillText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  prefPillTextActive: { color: Colors.teal.light },
});
