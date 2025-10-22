/**
 * CredentialStorageScreen Component
 * Handles secure storage and management of gametime.net credentials
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
import { useCredentialsStore } from "../../hooks/useCredentials";
import { useAuth } from "../../hooks/useAuth";

interface CredentialStorageScreenProps {
  onSuccess?: () => void;
}

/**
 * CredentialStorageScreen component for managing gametime.net credentials
 */
export function CredentialStorageScreen({
  onSuccess,
}: CredentialStorageScreenProps): React.ReactElement {
  const { user } = useAuth();
  const { credentials, isLoading, error, clearError, saveCredentials, updateCredentials, deleteCredentials, fetchCredentials } =
    useCredentialsStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch credentials on mount
  useEffect(() => {
    if (user?.id) {
      fetchCredentials(user.id);
    }
  }, [user?.id, fetchCredentials]);

  // Load existing credentials into form when editing
  useEffect(() => {
    if (isEditing && credentials) {
      setUsername(credentials.username);
      setPassword(credentials.password);
      setConfirmPassword(credentials.password);
    }
  }, [isEditing, credentials]);

  // Clear error message when user starts typing
  useEffect(() => {
    if (error && (username || password)) {
      clearError();
    }
  }, [username, password, error, clearError]);

  /**
   * Validate username
   */
  const validateUsername = (value: string): string | null => {
    if (!value) {
      return "Username is required";
    }
    if (value.trim().length === 0) {
      return "Username cannot be empty";
    }
    if (value.length < 3) {
      return "Username must be at least 3 characters";
    }
    return null;
  };

  /**
   * Validate password
   */
  const validatePassword = (value: string): string | null => {
    if (!value) {
      return "Password is required";
    }
    if (value.length < 4) {
      return "Password must be at least 4 characters";
    }
    return null;
  };

  /**
   * Validate confirm password
   */
  const validateConfirmPassword = (value: string): string | null => {
    if (!value) {
      return "Please confirm your password";
    }
    if (value !== password) {
      return "Passwords do not match";
    }
    return null;
  };

  /**
   * Handle username change
   */
  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameError(null);
  };

  /**
   * Handle password change
   */
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(null);
  };

  /**
   * Handle save/update credentials
   */
  const handleSaveCredentials = async () => {
    // Validate all fields
    const usernameErr = validateUsername(username);
    const passwordErr = validatePassword(password);
    const confirmPasswordErr = validateConfirmPassword(confirmPassword);

    setUsernameError(usernameErr);
    setPasswordError(passwordErr);

    if (usernameErr || passwordErr || confirmPasswordErr) {
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not authenticated. Please login again.");
      return;
    }

    if (isEditing && credentials) {
      // Update existing credentials
      await updateCredentials(user.id, credentials.id, {
        username,
        password,
      });
    } else {
      // Save new credentials
      await saveCredentials(user.id, {
        username,
        password,
      });
    }

    if (!error) {
      Alert.alert("Success", isEditing ? "Credentials updated successfully!" : "Credentials saved successfully!");
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setIsEditing(false);
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  /**
   * Handle delete credentials
   */
  const handleDeleteCredentials = () => {
    if (!credentials) {
      return;
    }

    Alert.alert("Delete Credentials", "Are you sure you want to delete your stored credentials?", [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          if (user?.id) {
            await deleteCredentials(user.id, credentials.id);
            if (!error) {
              Alert.alert("Success", "Credentials deleted successfully!");
              setUsername("");
              setPassword("");
              setConfirmPassword("");
              setIsEditing(false);
            }
          }
        },
        style: "destructive",
      },
    ]);
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setUsernameError(null);
    setPasswordError(null);
    setIsEditing(false);
    clearError();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Gametime.net Credentials</Text>
            <Text style={styles.subtitle}>Securely store your gametime.net login information</Text>
          </View>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Credentials display when saved */}
          {credentials && !isEditing && (
            <View style={styles.credentialsDisplay}>
              <Text style={styles.sectionTitle}>Saved Credentials</Text>
              <View style={styles.credentialItem}>
                <Text style={styles.label}>Username</Text>
                <Text style={styles.credentialValue}>{credentials.username}</Text>
              </View>
              <View style={styles.credentialItem}>
                <Text style={styles.label}>Password</Text>
                <Text style={styles.credentialValue}>{"••••••••"}</Text>
              </View>
              <Text style={styles.securityNote}>Your password is encrypted and stored securely.</Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>{isEditing ? "Update Credentials" : credentials ? "Update Credentials" : "Add Credentials"}</Text>

            {/* Username input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={[styles.input, usernameError && styles.inputError]}
                placeholder="Enter your gametime.net username"
                value={username}
                onChangeText={handleUsernameChange}
                editable={!isLoading}
                autoCapitalize="none"
              />
              {usernameError && <Text style={styles.errorMessage}>{usernameError}</Text>}
            </View>

            {/* Password input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.passwordInput, passwordError && styles.inputError]}
                  placeholder="Enter your gametime.net password"
                  value={password}
                  onChangeText={handlePasswordChange}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={!password}
                >
                  <Text style={styles.passwordToggleText}>{showPassword ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
              </View>
              {passwordError && <Text style={styles.errorMessage}>{passwordError}</Text>}
            </View>

            {/* Confirm password input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={[styles.passwordInput, password !== confirmPassword && confirmPassword && styles.inputError]}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  editable={!isLoading}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={!confirmPassword}
                >
                  <Text style={styles.passwordToggleText}>{showConfirmPassword ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
              </View>
              {password !== confirmPassword && confirmPassword && (
                <Text style={styles.errorMessage}>Passwords do not match</Text>
              )}
            </View>

            {/* Security note */}
            <View style={styles.securityNoteContainer}>
              <Text style={styles.securityNoteText}>
                Your credentials are encrypted before storage. Never share your password with anyone.
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
                onPress={handleSaveCredentials}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{isEditing ? "Update" : "Save"}</Text>}
              </TouchableOpacity>

              {isEditing && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
                  onPress={handleCancelEdit}
                  disabled={isLoading}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}

              {credentials && !isEditing && (
                <TouchableOpacity
                  style={[styles.button, styles.editButton, isLoading && styles.buttonDisabled]}
                  onPress={() => setIsEditing(true)}
                  disabled={isLoading}
                >
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {credentials && !isEditing && (
              <TouchableOpacity
                style={[styles.deleteButton, isLoading && styles.buttonDisabled]}
                onPress={handleDeleteCredentials}
                disabled={isLoading}
              >
                <Text style={styles.deleteButtonText}>Delete Credentials</Text>
              </TouchableOpacity>
            )}
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
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    backgroundColor: "#fee",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#c33",
  },
  errorText: {
    color: "#c33",
    fontSize: 14,
    fontWeight: "500",
  },
  credentialsDisplay: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  credentialItem: {
    marginBottom: 16,
  },
  credentialValue: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  securityNote: {
    fontSize: 12,
    color: "#999",
    marginTop: 12,
    fontStyle: "italic",
  },
  form: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#f9f9f9",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },
  passwordToggle: {
    paddingHorizontal: 12,
  },
  passwordToggleText: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "500",
  },
  inputError: {
    borderColor: "#c33",
    backgroundColor: "#fff9f9",
  },
  errorMessage: {
    color: "#c33",
    fontSize: 12,
    marginTop: 4,
  },
  securityNoteContainer: {
    backgroundColor: "#eff8ff",
    padding: 12,
    borderRadius: 6,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  securityNoteText: {
    fontSize: 12,
    color: "#0066cc",
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  secondaryButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  editButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#c33",
  },
  deleteButtonText: {
    color: "#c33",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
