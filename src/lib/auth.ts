import { create } from 'zustand';
import { accountUnavailable, accountsConfigured, supabase } from './supabase';
import type { Profile, Settings } from './types';
import { repository } from './repository';

type AuthState = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  settings: Settings | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  clear: () => void;
};

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  loading: false,
  error: null,
  userId: null,
  email: null,
  profile: null,
  settings: null,

  async signIn(email, password) {
    if (!accountsConfigured) {
      set({ error: accountUnavailable });
      throw new Error(accountUnavailable);
    }
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ loading: false, error: friendlyAuthError(error.message) });
      throw error;
    }
    set({ loading: false });
  },

  async signUp(email, password, displayName) {
    if (!accountsConfigured) {
      set({ error: accountUnavailable });
      throw new Error(accountUnavailable);
    }
    set({ loading: true, error: null });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) {
      set({ loading: false, error: friendlyAuthError(error.message) });
      throw error;
    }
    set({ loading: false });
  },

  async signOut() {
    await supabase.auth.signOut();
    get().clear();
  },

  async resetPassword(email) {
    if (!accountsConfigured) {
      set({ error: accountUnavailable });
      throw new Error(accountUnavailable);
    }
    set({ loading: true, error: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      set({ loading: false, error: friendlyAuthError(error.message) });
      throw error;
    }
    set({ loading: false });
  },

  async refreshProfile() {
    try {
      const p = await repository.loadProfile();
      if (p) set({ profile: p as Profile });
    } catch (e) {
      // non-fatal
    }
  },

  async refreshSettings() {
    try {
      const s = await repository.loadSettings();
      set({ settings: s });
    } catch (e) {
      // non-fatal
    }
  },

  clear() {
    set({ userId: null, email: null, profile: null, settings: null });
  },
}));

// Initialize session listener once
let initialized = false;
export function initAuth() {
  if (initialized) return;
  initialized = true;
  if (!accountsConfigured) {
    useAuth.setState({ ready: true });
    return;
  }

  supabase.auth.onAuthStateChange((event, session) => {
    (async () => {
      if (session?.user) {
        useAuth.setState({
          userId: session.user.id,
          email: session.user.email ?? null,
          ready: true,
        });
        await Promise.all([useAuth.getState().refreshProfile(), useAuth.getState().refreshSettings()]);
      } else {
        useAuth.getState().clear();
        useAuth.setState({ ready: true });
      }
    })();
  });
}

function friendlyAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email or password is incorrect.';
  if (m.includes('already registered')) return 'An account with this email already exists.';
  if (m.includes('rate limit')) return 'Too many attempts. Please wait a moment and try again.';
  if (m.includes('email not confirmed')) return 'Check your inbox for a confirmation link.';
  return msg;
}
