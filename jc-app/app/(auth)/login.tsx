/**
 * Login Route
 * Handles user login and navigation to app screens
 */

import React from 'react';
import { useRouter } from 'expo-router';
import { LoginScreen } from '../../src/screens/auth/LoginScreen';
import { useAuth } from '../../src/hooks/useAuth';
import { useEffect } from 'react';

/**
 * Login route screen
 * Renders LoginScreen and handles navigation after successful login
 */
export default function LoginRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  /**
   * Navigate to app screens after successful login
   */
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  /**
   * Handle navigation to register screen
   */
  const handleNavigateToRegister = () => {
    router.push('/(auth)/register');
  };

  /**
   * Handle successful login
   */
  const handleLoginSuccess = () => {
    // Navigation is handled by useEffect watching isAuthenticated
    // but we can keep this for explicit callback if needed
  };

  return (
    <LoginScreen
      onNavigateToRegister={handleNavigateToRegister}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}
