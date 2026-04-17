import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  // Resolves session + profile atomically — isLoading stays true until both are known
  setSessionAndProfile: (session: Session | null, onboardingComplete: boolean) => void;
  setSession: (session: Session | null) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  isAuthenticated: false,
  onboardingComplete: false,

  setSessionAndProfile: (session, onboardingComplete) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading: false,
      onboardingComplete,
    }),

  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading: false,
    }),

  setOnboardingComplete: (onboardingComplete) => set({ onboardingComplete }),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () =>
    set({
      session: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      onboardingComplete: false,
    }),
}));
