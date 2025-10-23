/**
 * BookingFormScreen
 * Provides a comprehensive form for users to create and manage court bookings
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Picker,
} from 'react-native';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useAuth } from '../../hooks/useAuth';
import { useBooking } from '../../hooks/useBooking';
import { BookingRecurrence, BookingInput } from '../../types/index';

/**
 * List of available courts
 */
const COURTS = [
  { value: '', label: 'Select a court...' },
  { value: 'court_1', label: 'Court 1 - Downtown' },
  { value: 'court_2', label: 'Court 2 - Uptown' },
  { value: 'court_3', label: 'Court 3 - Riverside' },
  { value: 'court_4', label: 'Court 4 - Park' },
];

/**
 * Available time slots
 */
const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
];

/**
 * Recurrence options
 */
const RECURRENCE_OPTIONS = [
  { value: BookingRecurrence.ONCE, label: 'Once' },
  { value: BookingRecurrence.WEEKLY, label: 'Weekly' },
  { value: BookingRecurrence.MONTHLY, label: 'Monthly' },
];

/**
 * Number of players options
 */
const PLAYER_COUNTS = [2, 3, 4, 5, 6, 7, 8];

/**
 * Validates booking form inputs
 */
function validateBooking(formData: BookingInput): string | null {
  if (!formData.court) {
    return 'Please select a court';
  }
  if (!formData.booking_date) {
    return 'Please select a booking date';
  }
  if (!formData.booking_time) {
    return 'Please select a booking time';
  }
  if (formData.number_of_players < 2 || formData.number_of_players > 8) {
    return 'Number of players must be between 2 and 8';
  }
  if (!formData.recurrence) {
    return 'Please select a recurrence pattern';
  }

  // Validate date format (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(formData.booking_date)) {
    return 'Invalid date format. Please use YYYY-MM-DD';
  }

  // Validate time format (HH:mm)
  const timeRegex = /^\d{2}:\d{2}$/;
  if (!timeRegex.test(formData.booking_time)) {
    return 'Invalid time format. Please use HH:mm';
  }

  // Check if date is in the future
  const selectedDate = new Date(formData.booking_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    return 'Booking date must be in the future';
  }

  return null;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * BookingFormScreen Component
 */
export default function BookingFormScreen() {
  const { user } = useAuth();
  const { createBooking, isLoading, error, clearError } = useBooking();

  // Form state
  const [formData, setFormData] = useState<BookingInput>({
    court: '',
    booking_date: getTodayDateString(),
    booking_time: '10:00',
    number_of_players: 4,
    recurrence: BookingRecurrence.ONCE,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  /**
   * Clear errors when component mounts
   */
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  /**
   * Show error or success message
   */
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  useEffect(() => {
    if (submitSuccess) {
      Alert.alert('Success', 'Booking created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setSubmitSuccess(false);
            // Reset form
            setFormData({
              court: '',
              booking_date: getTodayDateString(),
              booking_time: '10:00',
              number_of_players: 4,
              recurrence: BookingRecurrence.ONCE,
            });
            setValidationError(null);
          },
        },
      ]);
    }
  }, [submitSuccess]);

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    clearError();
    setValidationError(null);

    // Validate form
    const error = validateBooking(formData);
    if (error) {
      setValidationError(error);
      return;
    }

    if (!user?.id) {
      setValidationError('User not authenticated');
      return;
    }

    try {
      await createBooking(user.id, formData);
      setSubmitSuccess(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create booking';
      setValidationError(message);
    }
  };

  /**
   * Handle form reset
   */
  const handleReset = () => {
    setFormData({
      court: '',
      booking_date: getTodayDateString(),
      booking_time: '10:00',
      number_of_players: 4,
      recurrence: BookingRecurrence.ONCE,
    });
    setValidationError(null);
    clearError();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <ThemedText type="title">Book a Court</ThemedText>
          <ThemedText style={styles.subtitle}>
            Fill out the form below to schedule your court booking
          </ThemedText>
        </View>

        {/* Error Messages */}
        {(validationError || error) && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>
              {validationError || error}
            </ThemedText>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Court Selection</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.court}
              onValueChange={(value) => setFormData({ ...formData, court: value })}
              style={styles.picker}
            >
              {COURTS.map((court) => (
                <Picker.Item key={court.value} label={court.label} value={court.value} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Date (YYYY-MM-DD)</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="2025-10-25"
            value={formData.booking_date}
            onChangeText={(text) => setFormData({ ...formData, booking_date: text })}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Time</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.booking_time}
              onValueChange={(value) => setFormData({ ...formData, booking_time: value })}
              style={styles.picker}
            >
              {TIME_SLOTS.map((time) => (
                <Picker.Item key={time} label={time} value={time} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Number of Players</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.number_of_players}
              onValueChange={(value) => setFormData({ ...formData, number_of_players: value })}
              style={styles.picker}
            >
              {PLAYER_COUNTS.map((count) => (
                <Picker.Item key={count} label={count.toString()} value={count} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Recurrence Pattern</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.recurrence}
              onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
              style={styles.picker}
            >
              {RECURRENCE_OPTIONS.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Summary Section */}
        <View style={styles.summarySection}>
          <ThemedText style={styles.summaryTitle}>Booking Summary</ThemedText>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>Court:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {formData.court || 'Not selected'}
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>Date:</ThemedText>
            <ThemedText style={styles.summaryValue}>{formData.booking_date}</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>Time:</ThemedText>
            <ThemedText style={styles.summaryValue}>{formData.booking_time}</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>Players:</ThemedText>
            <ThemedText style={styles.summaryValue}>{formData.number_of_players}</ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>Recurrence:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {formData.recurrence.charAt(0).toUpperCase() + formData.recurrence.slice(1)}
            </ThemedText>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.submitButton, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Book Court</ThemedText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.resetButton]}
            onPress={handleReset}
            disabled={isLoading}
          >
            <ThemedText style={styles.resetButtonText}>Reset</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Spacing at bottom */}
        <View style={styles.spacer} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    marginTop: 16,
    marginBottom: 24,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
    fontSize: 14,
  },
  errorContainer: {
    backgroundColor: '#FFE6E6',
    borderColor: '#FF6B6B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#C92A2A',
    fontSize: 14,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#FFF',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  summarySection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    marginVertical: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  resetButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  spacer: {
    height: 16,
  },
});
