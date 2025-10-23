/**
 * Root Layout
 * Handles conditional routing based on authentication state
 * Shows auth screens or app screens depending on whether user is logged in
 */

import React, { useEffect, useRef } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useSegments, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';
import { initializeAuthListener } from '@/services/authListener';

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
  const routeCheckRef = useRef(false);

  /**
   * Initialize authentication on app startup
   * Check if there's a valid session stored locally and set up auth listener
   */
  useEffect(() => {
    // Set up auth state change listener first
    initializeAuthListener();
    // Then check for existing session
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

    // Prevent multiple route checks
    if (routeCheckRef.current) {
      return;
    }

    // Don't navigate if we don't have segments yet (initial render)
    if (segments.length === 0) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    // Only navigate if we're in the wrong group
    if (!isAuthenticated && inTabsGroup) {
      // User is not authenticated but in tabs group, redirect to login
      routeCheckRef.current = true;
      try {
        router.replace('/(auth)/login');
      } catch (error) {
        // Ignore navigation errors during initialization
        console.error('Navigation error (expected during init):', error);
      }
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but in auth group, redirect to app
      routeCheckRef.current = true;
      try {
        router.replace('/(tabs)');
      } catch (error) {
        // Ignore navigation errors during initialization
        console.error('Navigation error (expected during init):', error);
      }
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
