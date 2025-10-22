/**
 * LoginScreen Component
 * Handles user login with email and password
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
  Alert,
} from "react-native";
import { useAuth } from "../../hooks/useAuth";
import { getEmailError, getPasswordError, isValidEmail, isValidPassword } from "../../utils/validation";

interface LoginScreenProps {
  onNavigateToRegister?: () => void;
  onLoginSuccess?: () => void;
}

/**
 * LoginScreen component for user authentication
 */
export function LoginScreen({
  onNavigateToRegister,
  onLoginSuccess,
}: LoginScreenProps): React.ReactElement {
  const { login, isLoading, error, clearError, isAuthenticated } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Navigate on successful login
  useEffect(() => {
    if (isAuthenticated && onLoginSuccess) {
      onLoginSuccess();
    }
  }, [isAuthenticated, onLoginSuccess]);

  // Clear error message when user starts typing
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password, clearError, error]);

  /**
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const emailErr = getEmailError(email);
    const passwordErr = getPasswordError(password);

    setEmailError(emailErr);
    setPasswordError(passwordErr);

    return !emailErr && !passwordErr;
  };

  /**
   * Handle login submit
   */
  const handleLogin = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    await login({
      email: email.toLowerCase().trim(),
      password,
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
  };

  const isFormValid = isValidEmail(email) && isValidPassword(password);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>JC Court Booking</Text>
            <Text style={styles.subtitle}>Sign In to Your Account</Text>
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
                testID="login-email-input"
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
                  testID="login-password-input"
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
            </View>

            {/* General Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
            )}

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.button,
                (!isFormValid || isLoading) && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!isFormValid || isLoading}
              testID="login-button"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity
                onPress={onNavigateToRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerLink}>Sign Up</Text>
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
  errorText: {
    color: "#e74c3c",
    fontSize: 12,
    marginTop: 4,
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
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 14,
    color: "#666",
  },
  registerLink: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "600",
  },
});
