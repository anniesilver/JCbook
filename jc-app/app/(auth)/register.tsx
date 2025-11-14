/**
 * Register Route
 * Handles user registration and navigation to app screens or login
 */

import React from 'react';
import { useRouter } from 'expo-router';
import { RegisterScreen } from '../../src/screens/auth/RegisterScreen';
import { useAuth } from '../../src/hooks/useAuth';
import { useEffect } from 'react';

/**
 * Register route screen
 * Renders RegisterScreen and handles navigation after successful registration
 */
export default function RegisterRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  /**
   * Navigate to app screens after successful registration
   */
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  /**
   * Handle navigation to login screen
   */
  const handleNavigateToLogin = () => {
    router.back();
  };

  /**
   * Handle successful registration
   */
  const handleRegisterSuccess = () => {
    // Navigation is handled by useEffect watching isAuthenticated
    // but we can keep this for explicit callback if needed
  };

  return (
    <RegisterScreen
      onNavigateToLogin={handleNavigateToLogin}
      onRegisterSuccess={handleRegisterSuccess}
    />
  );
}
