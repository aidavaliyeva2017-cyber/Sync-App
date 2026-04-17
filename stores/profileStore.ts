import { create } from 'zustand';
import type { Profile } from '../types/database';

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  updateProfile: (updates: Partial<Profile>) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoading: false,

  setProfile: (profile) => set({ profile }),

  updateProfile: (updates) =>
    set((state) => ({
      profile: state.profile ? { ...state.profile, ...updates } : null,
    })),

  setLoading: (isLoading) => set({ isLoading }),

  reset: () => set({ profile: null, isLoading: false }),
}));
