/**
 * Root Layout
 * Handles conditional routing based on authentication state
 * Shows auth screens or app screens depending on whether user is logged in
 */

import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';

export const unstable_settings = {
  anchor: '(tabs)',
};

/**
 * Root layout with authentication-aware routing
 * Initializes auth on app load and routes to appropriate section
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { isAuthenticated, isLoading, initializeAuth } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  /**
   * Initialize authentication on app startup
   * Check if there's a valid session stored locally
   */
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  /**
   * Handle routing based on authentication state
   * Routes to (auth) if not authenticated, (tabs) if authenticated
   */
  useEffect(() => {
    if (isLoading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // User is not authenticated and not in auth group, redirect to login
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but in auth group, redirect to app
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments, router]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
            animationEnabled: false,
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
            animationEnabled: false,
          }}
        />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            title: 'Modal',
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
