import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your .env file.');
}

const customStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return null;
    }
    try {
      return await AsyncStorage.getItem(key);
    } catch (e) {
      return null;
    }
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      // ignore
    }
  },
  removeItem: async (key: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      // ignore
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auto refresh session when app comes to foreground
if (typeof window !== 'undefined') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
