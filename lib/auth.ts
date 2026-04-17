// Auth helper functions — to be implemented in Layer 2
// Placeholder for: signUp, signIn, signOut, resetPassword, verifyEmail

import { supabase } from './supabase';

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
