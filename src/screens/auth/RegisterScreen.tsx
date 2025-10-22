/**
 * RegisterScreen Component
 * Handles user registration with email and password
 */

import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  Text,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import {
  getEmailError,
  getPasswordError,
  getConfirmPasswordError,
  isValidEmail,
  isValidPassword,
} from "../../utils/validation";

interface RegisterScreenProps {
  onNavigateToLogin?: () => void;
  onRegisterSuccess?: () => void;
}

/**
 * RegisterScreen component for new user registration
 */
export function RegisterScreen({
  onNavigateToLogin,
  onRegisterSuccess,
}: RegisterScreenProps): React.ReactElement {
  const { register, isLoading, error, clearError, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Navigate on successful registration
  useEffect(() => {
    if (isAuthenticated && onRegisterSuccess) {
      onRegisterSuccess();
    }
  }, [isAuthenticated, onRegisterSuccess]);

  // Clear error message when user starts typing
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password, confirmPassword, clearError, error]);

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const emailErr = getEmailError(email);
    const passwordErr = getPasswordError(password);
    const confirmPasswordErr = getConfirmPasswordError(password, confirmPassword);

    setEmailError(emailErr);
    setPasswordError(passwordErr);
    setConfirmPasswordError(confirmPasswordErr);

    return !emailErr && !passwordErr && !confirmPasswordErr && agreedToTerms;
  };

  /**
   * Handle registration submit
   */
  const handleRegister = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    await register({
      email: email.toLowerCase().trim(),
      password,
      confirmPassword,
    });
  };

  /**
   * Real-time email validation
   */
  const handleEmailChange = (text: string): void => {
    setEmail(text);
    if (text) {
      setEmailError(getEmailError(text));
    } else {
      setEmailError(null);
    }
  };

  /**
   * Real-time password validation
   */
  const handlePasswordChange = (text: string): void => {
    setPassword(text);
    if (text) {
      setPasswordError(getPasswordError(text));
    } else {
      setPasswordError(null);
    }
    // Also validate confirm password when password changes
    if (confirmPassword) {
      setConfirmPasswordError(getConfirmPasswordError(text, confirmPassword));
    }
  };

  /**
   * Real-time confirm password validation
   */
  const handleConfirmPasswordChange = (text: string): void => {
    setConfirmPassword(text);
    if (text) {
      setConfirmPasswordError(getConfirmPasswordError(password, text));
    } else {
      setConfirmPasswordError(null);
    }
  };

  const isFormValid =
    isValidEmail(email) &&
    isValidPassword(password) &&
    password === confirmPassword &&
    agreedToTerms;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>JC Court Booking</Text>
            <Text style={styles.subtitle}>Create Your Account</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={[
                  styles.input,
                  emailError && styles.inputError,
                ]}
                placeholder="your@email.com"
                placeholderTextColor="#999"
                editable={!isLoading}
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                testID="register-email-input"
              />
              {emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    passwordError && styles.inputError,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  editable={!isLoading}
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  testID="register-password-input"
                />
                <TouchableOpacity
                  style={styles.togglePassword}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.togglePasswordText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              {passwordError && <Text style={styles.errorText}>{passwordError}</Text>}
              <Text style={styles.hint}>Minimum 6 characters</Text>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[
                    styles.passwordInput,
                    confirmPasswordError && styles.inputError,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#999"
                  editable={!isLoading}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  testID="register-confirm-password-input"
                />
                <TouchableOpacity
                  style={styles.togglePassword}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.togglePasswordText}>
                    {showConfirmPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
              {confirmPasswordError && (
                <Text style={styles.errorText}>{confirmPasswordError}</Text>
              )}
            </View>

            {/* Terms Agreement */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                disabled={isLoading}
              >
                <View style={[styles.checkboxBox, agreedToTerms && styles.checkboxBoxChecked]}>
                  {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
              <Text style={styles.termsText}>
                I agree to the Terms of Service and Privacy Policy
              </Text>
            </View>

            {/* General Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (!isFormValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={!isFormValid || isLoading}
              testID="register-button"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={onNavigateToLogin}
                disabled={isLoading}
              >
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  formContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fafafa",
  },
  inputError: {
    borderColor: "#e74c3c",
    backgroundColor: "#fee",
  },
  passwordInputContainer: {
    position: "relative",
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 50,
    fontSize: 16,
    color: "#333",
    backgroundColor: "#fafafa",
  },
  togglePassword: {
    position: "absolute",
    right: 12,
    top: 12,
    paddingHorizontal: 8,
  },
  togglePasswordText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  errorText: {
    color: "#e74c3c",
    fontSize: 12,
    marginTop: 4,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  checkbox: {
    paddingRight: 12,
    paddingTop: 2,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxBoxChecked: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: "#fee",
    borderLeftWidth: 4,
    borderLeftColor: "#e74c3c",
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  errorMessage: {
    color: "#e74c3c",
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    fontSize: 14,
    color: "#666",
  },
  loginLink: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
});
