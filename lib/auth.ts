import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { supabase } from './supabase';

export async function signUp(email: string, password: string) {
  try {
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          email: email,
        },
      },
    });

    if (signUpError) throw signUpError;

    if (!user) throw new Error('No user data returned');

    // Create initial profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Still proceed since the user was created
    }

    // Automatically sign in after registration
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    router.replace('/(tabs)');
    return { user, error: null };
  } catch (error: any) {
    console.error('Sign up error:', error);
    return { user: null, error };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    router.replace('/(tabs)');
    return { user, error: null };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return { user: null, error };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    router.replace('/auth');
  } catch (error) {
    console.error('Sign out error:', error);
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}