import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace these with your Supabase project URL and anon key
// from: https://app.supabase.com → Project Settings → API
const SUPABASE_URL = 'https://uwwzzysmdgjqiyacwbzr.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VMmGbW9aY0BTNipmu-555Q_jJfnc0ct';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
