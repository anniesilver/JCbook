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
import { useAuth } from '../src/hooks/useAuth';
import { initializeAuthListener } from '../src/services/authListener';

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
  const navigationReadyRef = useRef(false);

  /**
   * Initialize authentication on app startup
   * Check if there's a valid session stored locally and set up auth listener
   */
  useEffect(() => {
    // Set up auth state change listener first
    initializeAuthListener();
    // Then check for existing session
    initializeAuth();

    // Mark navigation as ready after a brief delay to let the Stack mount
    const timer = setTimeout(() => {
      navigationReadyRef.current = true;
      console.log('[RootLayout] Navigation ready');
    }, 100);

    return () => clearTimeout(timer);
  }, [initializeAuth]);

  /**
   * Handle routing based on authentication state
   * Routes to (auth) if not authenticated, (tabs) if authenticated
   */
  useEffect(() => {
    if (isLoading) {
      return;
    }

    // Wait for navigation to be ready before routing
    if (!navigationReadyRef.current) {
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
        console.log('[RootLayout] Redirecting to login (not authenticated)');
        router.replace('/(auth)/login');
      } catch (error) {
        // Ignore navigation errors during initialization
        console.warn('[RootLayout] Navigation error (suppressed):', (error as Error).message);
      }
    } else if (isAuthenticated && inAuthGroup) {
      // User is authenticated but in auth group, redirect to app
      routeCheckRef.current = true;
      try {
        console.log('[RootLayout] Redirecting to tabs (authenticated)');
        router.replace('/(tabs)');
      } catch (error) {
        // Ignore navigation errors during initialization
        console.warn('[RootLayout] Navigation error (suppressed):', (error as Error).message);
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
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
