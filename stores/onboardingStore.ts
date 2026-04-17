import { create } from 'zustand';

export interface OnboardingData {
  photoUri: string | null;
  fullName: string;
  username: string;
  age: string;
  city: string;
  country: string;
  connectPreference: 'in-person' | 'online' | 'both';
  major: string;
  university: string;
  interests: string[];
  projects: string;
  linkedinUrl: string;
}

interface OnboardingStore extends OnboardingData {
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  reset: () => void;
}

const initial: OnboardingData = {
  photoUri: null,
  fullName: '',
  username: '',
  age: '',
  city: '',
  country: '',
  connectPreference: 'both',
  major: '',
  university: '',
  interests: [],
  projects: '',
  linkedinUrl: '',
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  ...initial,
  setField: (key, value) => set({ [key]: value } as Partial<OnboardingStore>),
  reset: () => set(initial),
}));
