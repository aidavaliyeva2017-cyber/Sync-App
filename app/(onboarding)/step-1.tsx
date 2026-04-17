import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { ScreenBackground } from '../../components/ScreenBackground';
import { Button } from '../../components/ui/Button';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { Colors } from '../../constants/colors';
import { Typography } from '../../constants/typography';

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function OnboardingStep1() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photoUri, fullName, username, setField } = useOnboardingStore();

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username]);

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setField('photoUri', result.assets[0].uri);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets[0]) {
      setField('photoUri', result.assets[0].uri);
    }
  };

  const handlePhotoPress = () => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['Cancel', 'Take Photo', 'Choose from Library'],
        cancelButtonIndex: 0,
      },
      (index) => {
        if (index === 1) pickFromCamera();
        if (index === 2) pickFromLibrary();
      }
    );
  };

  const canContinue =
    fullName.trim().length > 0 &&
    username.trim().length >= 3 &&
    usernameStatus === 'available';

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
              <View key={n} style={[styles.dot, n === 1 && styles.dotActive]} />
            ))}
          </View>

          <Text style={styles.title}>Your profile</Text>
          <Text style={styles.subtitle}>Let's get started with the basics</Text>

          {/* Photo */}
          <TouchableOpacity
            onPress={handlePhotoPress}
            style={styles.photoWrap}
            activeOpacity={0.8}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <LinearGradient
                colors={[Colors.teal.main, Colors.teal.bright]}
                style={styles.photo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Feather name="camera" size={28} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            )}
            <View style={styles.photoEditBadge}>
              <Feather name="edit-2" size={11} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Optional</Text>

          {/* Full name */}
          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={fullName}
            onChangeText={(t) => setField('fullName', t)}
            autoCapitalize="words"
          />

          {/* Username */}
          <Text style={[styles.label, { marginTop: 16 }]}>Username</Text>
          <View>
            <TextInput
              style={[
                styles.input,
                { paddingRight: 46 },
                usernameStatus === 'taken' ? styles.inputError : undefined,
              ]}
              placeholder="yourhandle"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={username}
              onChangeText={(t) => setField('username', t.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameStatus !== 'idle' && (
              <View style={styles.usernameStatus}>
                {usernameStatus === 'checking' && (
                  <Feather name="loader" size={16} color={Colors.text.label} />
                )}
                {usernameStatus === 'available' && (
                  <Feather name="check-circle" size={16} color={Colors.teal.bright} />
                )}
                {usernameStatus === 'taken' && (
                  <Feather name="x-circle" size={16} color={Colors.error} />
                )}
              </View>
            )}
          </View>
          {usernameStatus === 'taken' && (
            <Text style={styles.errorText}>Username already taken</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Next button pinned to bottom */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Next"
          onPress={() => router.push('/(onboarding)/step-2')}
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
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dotActive: {
    backgroundColor: Colors.teal.main,
    width: 20,
    borderRadius: 4,
  },
  title: {
    fontSize: Typography.size.screenTitle,
    fontWeight: Typography.weight.screenTitle,
    color: Colors.text.primary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.text.body,
    marginBottom: 28,
  },
  photoWrap: {
    alignSelf: 'center',
    marginBottom: 6,
  },
  photo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.teal.main,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.background.base,
  },
  photoHint: {
    fontSize: 11,
    color: Colors.text.label,
    textAlign: 'center',
    marginBottom: 28,
  },
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
  usernameStatus: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 6,
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
