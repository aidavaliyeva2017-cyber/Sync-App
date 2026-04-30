import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useProfileStore } from '../stores/profileStore';
import { ScreenBackground } from '../components/ScreenBackground';
import { GlassCard } from '../components/ui/GlassCard';
import { Colors } from '../constants/colors';
import { Typography } from '../constants/typography';

const PREF_KEYS = {
  requests: '@sync/notif_connection_requests',
  messages: '@sync/notif_messages',
  matches: '@sync/notif_matches',
} as const;

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reset: resetAuth } = useAuthStore();
  const { reset: resetProfile } = useProfileStore();

  const [notifRequests, setNotifRequests] = useState(true);
  const [notifMessages, setNotifMessages] = useState(true);
  const [notifMatches, setNotifMatches] = useState(true);
  const [toast, setToast] = useState('');

  // Load persisted prefs on mount
  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PREF_KEYS.requests),
      AsyncStorage.getItem(PREF_KEYS.messages),
      AsyncStorage.getItem(PREF_KEYS.matches),
    ]).then(([req, msg, match]) => {
      if (req !== null) setNotifRequests(req !== 'false');
      if (msg !== null) setNotifMessages(msg !== 'false');
      if (match !== null) setNotifMatches(match !== 'false');
    });
  }, []);

  const setAndPersistRequests = (v: boolean) => {
    setNotifRequests(v);
    AsyncStorage.setItem(PREF_KEYS.requests, String(v));
  };
  const setAndPersistMessages = (v: boolean) => {
    setNotifMessages(v);
    AsyncStorage.setItem(PREF_KEYS.messages, String(v));
  };
  const setAndPersistMatches = (v: boolean) => {
    setNotifMatches(v);
    AsyncStorage.setItem(PREF_KEYS.matches, String(v));
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            resetAuth();
            resetProfile();
            // Routing guard in _layout.tsx will redirect to welcome
          },
        },
      ]
    );
  };

  return (
    <ScreenBackground>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="chevron-left" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
        <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          {[
            { label: 'Connection requests', value: notifRequests, setter: setAndPersistRequests },
            { label: 'Messages', value: notifMessages, setter: setAndPersistMessages },
            { label: 'Match suggestions', value: notifMatches, setter: setAndPersistMatches },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[styles.settingsRow, i < arr.length - 1 && styles.settingsRowBorder]}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Switch
                value={row.value}
                onValueChange={row.setter}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: Colors.teal.main }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="rgba(255,255,255,0.15)"
              />
            </View>
          ))}
        </GlassCard>

        {/* Account */}
        <Text style={styles.sectionHeader}>ACCOUNT</Text>
        <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          {[
            { label: 'Change email', onPress: () => router.push('/change-email') },
            { label: 'Change password', onPress: () => router.push('/change-password') },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.settingsRow, i < arr.length - 1 && styles.settingsRowBorder]}
              onPress={row.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Feather name="chevron-right" size={16} color={Colors.text.hint} />
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* About */}
        <Text style={styles.sectionHeader}>ABOUT</Text>
        <GlassCard style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          {[
            { label: 'About Sync', onPress: () => router.push('/about') },
            { label: 'Terms of Service', onPress: () => router.push('/terms') },
            { label: 'Privacy Policy', onPress: () => router.push('/privacy') },
          ].map((row, i, arr) => (
            <TouchableOpacity
              key={row.label}
              style={[styles.settingsRow, i < arr.length - 1 && styles.settingsRowBorder]}
              onPress={row.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Feather name="chevron-right" size={16} color={Colors.text.hint} />
            </TouchableOpacity>
          ))}
        </GlassCard>

        {/* Danger zone */}
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <TouchableOpacity
            style={[styles.settingsRow, styles.settingsRowBorder]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, { color: Colors.error }]}>Log out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => showToast('Account deletion coming soon')}
            activeOpacity={0.7}
          >
            <Text style={[styles.rowLabel, { color: Colors.error }]}>Delete account</Text>
          </TouchableOpacity>
        </GlassCard>
      </ScrollView>

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
  scroll: { paddingHorizontal: 14 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  screenTitle: {
    fontSize: Typography.size.screenTitle,
    fontWeight: '700',
    color: Colors.text.primary,
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
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowLabel: { fontSize: 15, color: Colors.text.primary },
  toast: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
    backgroundColor: 'rgba(30,30,40,0.95)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  toastText: { fontSize: 13, color: Colors.text.body, fontWeight: '500' },
});
