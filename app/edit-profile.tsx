import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { ScreenBackground } from '../components/ScreenBackground';
import { Tag } from '../components/ui/Tag';
import { COUNTRIES } from '../constants/countries';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

const PRESET_INTERESTS = [
  'Design', 'AI / Machine Learning', 'Startups', 'Business', 'Engineering',
  'Data Science', 'Marketing', 'Sustainability', 'Product Management',
  'Computer Science', 'Finance', 'Health & Wellness',
];

function isValidLinkedIn(url: string) {
  return url === '' || /^https?:\/\/(www\.)?linkedin\.com\/in\//.test(url.trim());
}

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { profile, setProfile } = useProfileStore();

  // Form state seeded from existing profile
  const [photoUri, setPhotoUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [age, setAge] = useState(profile?.age?.toString() ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [country, setCountry] = useState(profile?.country ?? '');
  const [major, setMajor] = useState(profile?.major ?? '');
  const [university, setUniversity] = useState(profile?.university ?? '');
  const [interests, setInterests] = useState<string[]>(profile?.interests ?? []);
  const [projects, setProjects] = useState(profile?.projects ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? '');

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDirty =
    photoUri !== (profile?.avatar_url ?? null) ||
    fullName !== (profile?.full_name ?? '') ||
    username !== (profile?.username ?? '') ||
    age !== (profile?.age?.toString() ?? '') ||
    city !== (profile?.city ?? '') ||
    country !== (profile?.country ?? '') ||
    major !== (profile?.major ?? '') ||
    university !== (profile?.university ?? '') ||
    JSON.stringify(interests) !== JSON.stringify(profile?.interests ?? []) ||
    projects !== (profile?.projects ?? '') ||
    linkedinUrl !== (profile?.linkedin_url ?? '');

  // Username availability check
  useEffect(() => {
    if (username === profile?.username) { setUsernameStatus('idle'); return; }
    if (username.length < 3) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [username, profile?.username]);

  const handleBack = () => {
    if (!isDirty) { router.back(); return; }
    Alert.alert('Discard changes?', '', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  const pickPhoto = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
      async (index) => {
        if (index === 1) {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
          if (!r.canceled && r.assets[0]) setPhotoUri(r.assets[0].uri);
        }
        if (index === 2) {
          const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
          if (!r.canceled && r.assets[0]) setPhotoUri(r.assets[0].uri);
        }
      }
    );
  };

  const toggleInterest = (tag: string) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter((t) => t !== tag));
    } else if (interests.length < 3) {
      setInterests([...interests, tag]);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (usernameStatus === 'taken') return;
    if (linkedinUrl && !isValidLinkedIn(linkedinUrl)) {
      setToast('Please enter a valid LinkedIn URL');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    setSaving(true);

    let avatarUrl = profile?.avatar_url ?? null;
    // Upload new photo only if it's a local file URI (not the existing URL)
    if (photoUri && photoUri !== profile?.avatar_url) {
      const ext = photoUri.split('.').pop() ?? 'jpg';
      const path = `${user.id}/profile.${ext}`;
      const response = await fetch(photoUri);
      const blob = await response.blob();
      const ab = await new Response(blob).arrayBuffer();
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, ab, { contentType: `image/${ext}`, upsert: true });
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }
    }

    const updates = {
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      avatar_url: avatarUrl,
      age: parseInt(age, 10),
      city: city.trim(),
      country,
      major: major.trim(),
      university: university.trim() || null,
      interests: interests as [string, string, string],
      projects: projects.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    setSaving(false);
    if (error) {
      setToast('Failed to save. Please try again.');
      setTimeout(() => setToast(''), 2500);
      return;
    }
    if (data) setProfile(data);
    setToast('Profile updated!');
    setTimeout(() => { router.back(); }, 1500);
  };

  const filteredCountries = countrySearch.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  const canSave =
    fullName.trim().length > 0 &&
    username.trim().length >= 3 &&
    usernameStatus !== 'taken' &&
    interests.length === 3 &&
    !saving;

  return (
    <ScreenBackground>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="chevron-left" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Edit profile</Text>
            <TouchableOpacity onPress={handleSave} disabled={!canSave}>
              {saving
                ? <ActivityIndicator size="small" color={Colors.teal.bright} />
                : <Text style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}>Save</Text>}
            </TouchableOpacity>
          </View>

          {/* Photo */}
          <TouchableOpacity onPress={pickPhoto} style={styles.photoWrap} activeOpacity={0.8}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <LinearGradient colors={[Colors.teal.main, Colors.teal.bright]} style={styles.photo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Feather name="camera" size={28} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            )}
            <View style={styles.photoEditBadge}>
              <Feather name="edit-2" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Fields */}
          {[
            { label: 'Full name', value: fullName, setter: setFullName, cap: 'words' as const },
            { label: 'Major', value: major, setter: setMajor, cap: 'words' as const },
            { label: 'University', value: university, setter: setUniversity, cap: 'words' as const },
            { label: 'City', value: city, setter: setCity, cap: 'words' as const },
          ].map((field) => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={styles.label}>{field.label.toUpperCase()}</Text>
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={field.setter}
                autoCapitalize={field.cap}
                placeholderTextColor="rgba(255,255,255,0.3)"
                placeholder={field.label}
              />
            </View>
          ))}

          {/* Username */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>USERNAME</Text>
            <View>
              <TextInput
                style={[styles.input, { paddingRight: 44 }, usernameStatus === 'taken' && styles.inputError]}
                value={username}
                onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="yourhandle"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
              {usernameStatus !== 'idle' && (
                <View style={styles.usernameIcon}>
                  {usernameStatus === 'checking' && <Feather name="loader" size={16} color={Colors.text.label} />}
                  {usernameStatus === 'available' && <Feather name="check-circle" size={16} color={Colors.teal.bright} />}
                  {usernameStatus === 'taken' && <Feather name="x-circle" size={16} color={Colors.error} />}
                </View>
              )}
            </View>
            {usernameStatus === 'taken' && <Text style={styles.errorText}>Username already taken</Text>}
          </View>

          {/* Age */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>AGE</Text>
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="Your age"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </View>

          {/* Country */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>COUNTRY</Text>
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
          </View>

          {/* Interests */}
          <View style={styles.fieldGroup}>
            <View style={styles.interestsHeader}>
              <Text style={styles.label}>INTERESTS</Text>
              <Text style={[styles.counter, interests.length === 3 && styles.counterFull]}>
                {interests.length}/3
              </Text>
            </View>
            <View style={styles.tagsWrap}>
              {PRESET_INTERESTS.map((tag) => {
                const selected = interests.includes(tag);
                const disabled = !selected && interests.length >= 3;
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleInterest(tag)}
                    disabled={disabled}
                    activeOpacity={0.7}
                    style={[styles.tagBtn, selected && styles.tagBtnSelected, disabled && styles.tagBtnDisabled]}
                  >
                    <Text style={[styles.tagBtnText, selected && styles.tagBtnTextSelected, disabled && styles.tagBtnTextDisabled]}>
                      {tag}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Projects */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>CURRENT PROJECTS</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={projects}
              onChangeText={setProjects}
              multiline
              textAlignVertical="top"
              placeholder="What are you working on?"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </View>

          {/* LinkedIn */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>LINKEDIN URL</Text>
            <TextInput
              style={styles.input}
              value={linkedinUrl}
              onChangeText={setLinkedinUrl}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="https://linkedin.com/in/yourhandle"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Country picker */}
      <Modal visible={showCountryPicker} animationType="slide" transparent onRequestClose={() => setShowCountryPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCountryPicker(false)} />
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
                onPress={() => { setCountry(item.name); setCountrySearch(''); setShowCountryPicker(false); }}
              >
                <Text style={[styles.countryText, item.name === country && styles.countryTextActive]}>
                  {item.name}
                </Text>
                {item.name === country && <Feather name="check" size={16} color={Colors.teal.bright} />}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      {toast ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  screenTitle: { fontSize: 17, fontWeight: '600', color: Colors.text.primary },
  saveBtn: { fontSize: 15, fontWeight: '600', color: Colors.teal.bright },
  saveBtnDisabled: { color: Colors.text.hint },
  photoWrap: { alignSelf: 'center', marginBottom: 28 },
  photo: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  photoEditBadge: {
    position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.teal.main, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.background.base,
  },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '500', color: Colors.text.label, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  input: {
    height: 48, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.10)', borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: '#FFFFFF',
  },
  inputError: { borderColor: Colors.error },
  textArea: { height: 96, paddingTop: 13, paddingBottom: 13 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerText: { fontSize: 14, color: '#FFFFFF' },
  pickerPlaceholder: { fontSize: 14, color: 'rgba(255,255,255,0.3)' },
  usernameIcon: { position: 'absolute', right: 14, top: 0, bottom: 0, justifyContent: 'center' },
  errorText: { fontSize: 12, color: Colors.error, marginTop: 6 },
  interestsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  counter: { fontSize: 13, fontWeight: '600', color: Colors.text.label },
  counterFull: { color: Colors.teal.bright },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBtn: {
    paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  tagBtnSelected: { backgroundColor: Colors.teal.tagBgAlpha, borderColor: Colors.teal.tagBorderAlpha },
  tagBtnDisabled: { opacity: 0.35 },
  tagBtnText: { fontSize: 13, fontWeight: '500', color: Colors.text.body },
  tagBtnTextSelected: { color: Colors.teal.light },
  tagBtnTextDisabled: { color: Colors.text.hint },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: Colors.background.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '60%',
  },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text.primary, marginBottom: 12 },
  searchInput: {
    height: 44, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12, paddingHorizontal: 14, fontSize: 14, color: '#FFFFFF', marginBottom: 10,
  },
  countryItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: Colors.glass.divider,
  },
  countryItemActive: {},
  countryText: { fontSize: 15, color: Colors.text.body },
  countryTextActive: { color: Colors.text.primary, fontWeight: '500' },
  toast: {
    position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: 'rgba(30,30,40,0.95)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10,
  },
  toastText: { fontSize: 13, color: Colors.text.body, fontWeight: '500' },
});
