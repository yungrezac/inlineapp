import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Implement a web-compatible storage adapter
const webStorageAdapter = {
  getItem: (key: string) => {
    try {
      const value = localStorage.getItem(key);
      return Promise.resolve(value);
    } catch (e) {
      return Promise.reject(e);
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
      return Promise.resolve(undefined);
    } catch (e) {
      return Promise.reject(e);
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
      return Promise.resolve(undefined);
    } catch (e) {
      return Promise.reject(e);
    }
  },
};

// Use platform-specific storage adapter
const storageAdapter = Platform.OS === 'web' ? webStorageAdapter : {
  getItem: (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client with enhanced error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'expo-router',
    },
  },
});

// Enhanced fetch error handling
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const [url, config = {}] = args;
  
  try {
    const response = await originalFetch(...args);
    
    if (!response.ok) {
      // Log detailed error information
      console.error('Fetch error:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        headers: Object.fromEntries(response.headers.entries()),
        config: {
          method: config.method || 'GET',
          headers: config.headers,
        }
      });

      // For Supabase-specific errors, try to get more details
      if (url.toString().includes(supabaseUrl)) {
        try {
          const errorData = await response.clone().json();
          console.error('Supabase error details:', errorData);
        } catch (e) {
          // If we can't parse the error response, log the raw text
          const errorText = await response.clone().text();
          console.error('Supabase error response:', errorText);
        }
      }
    }
    
    return response;
  } catch (error) {
    // Log network-level errors
    console.error('Network error:', {
      message: error.message,
      type: error.name,
      url: typeof url === 'string' ? url : url.toString(),
      config: {
        method: config.method || 'GET',
        headers: config.headers,
      }
    });
    
    throw error;
  }
};

// Test Supabase connection
(async () => {
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.error('Supabase connection test failed:', error);
    } else {
      console.log('Supabase connection test successful');
    }
  } catch (error) {
    console.error('Failed to test Supabase connection:', error);
  }
})();