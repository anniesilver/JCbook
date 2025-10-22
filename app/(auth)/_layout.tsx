/**
 * Auth Stack Navigation Layout
 * Handles authentication flow with Stack navigation
 * Shows only when user is not authenticated
 */

import React from 'react';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Auth layout with Stack navigation
 * Displays login and register screens without bottom tab navigation
 */
export default function AuthLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          animationEnabled: true,
        }}
      >
        <Stack.Screen
          name="login"
          options={{
            title: 'Login',
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            title: 'Register',
            animationEnabled: true,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
