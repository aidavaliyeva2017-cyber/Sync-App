import React, { useEffect } from 'react';
import { Linking, View, Text, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

export default function RootLayout() {
  const { setSessionAndProfile, setLoading, isAuthenticated, isLoading, onboardingComplete } =
    useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Handle deep link callbacks (email verification, password reset)
  useEffect(() => {
    const handleUrl = async (url: string) => {
      // Supabase appends #access_token=...&type=signup or ?code=...
      if (!url) return;
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        url.includes('code=') ? new URL(url).searchParams.get('code') ?? '' : url
      );
      if (!error && data.session) {
        supabase.auth.setSession(data.session);
      }
    };

    // Handle URL that launched the app (cold start from email link)
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    // Handle URL while app is already open
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  // Load session on mount and subscribe to auth changes.
  // Use onAuthStateChange only — it fires INITIAL_SESSION immediately with the
  // stored session, avoiding a redundant getSession() call and the race condition
  // that causes double profile fetches.
  useEffect(() => {
    const resolveSession = async (session: any) => {
      try {
        if (session?.user?.id) {
          const { data } = await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', session.user.id)
            .single();
          // data may be null if profile doesn't exist yet — default to false
          setSessionAndProfile(session, data?.onboarding_complete ?? false);
        } else {
          setSessionAndProfile(null, false);
        }
      } catch {
        // Profile fetch failed (network error, RLS, etc.) — unblock the app
        setSessionAndProfile(session ?? null, false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveSession(session);
    });

    // Hard safety net: unblock after 10 s no matter what (network hang, etc.)
    const timeout = setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        setLoading(false);
      }
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Routing guard: redirect based on auth + onboarding state.
  // Fires whenever isLoading/isAuthenticated/onboardingComplete/segments change.
  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    // Root index route: segments is [] — the app's entry point before any navigation
    const onRootIndex = segments.length === 0;

    if (!isAuthenticated && !inAuth) {
      // Logged-out user anywhere outside auth screens → welcome
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && !onboardingComplete && !inOnboarding) {
      // Logged-in but hasn't completed onboarding → step 1
      router.replace('/(onboarding)/step-1');
    } else if (isAuthenticated && onboardingComplete && (inAuth || inOnboarding || onRootIndex)) {
      // Logged-in + onboarded, but still on a "pre-app" screen → home
      // Covers: landing on index.tsx, returning from auth flow, finishing onboarding
      router.replace('/(tabs)/home');
    }
    // All other cases (tabs, chat, profile, settings, etc.) — stay put
  }, [isAuthenticated, isLoading, onboardingComplete, segments]);

  // Block all routing until session + profile are both resolved
  if (isLoading) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="transparent" translucent />
        <View style={styles.splash}>
          <Text style={styles.splashText}>Sync</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="profile/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="edit-profile" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
