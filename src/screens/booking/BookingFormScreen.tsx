/**
 * BookingFormScreen - iOS-Style Clean Interface
 * Provides a comprehensive form for users to create court bookings
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Checkbox from 'expo-checkbox';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '../../components/themed-text';
import { useAuth } from '../../hooks/useAuth';
import { useBooking } from '../../hooks/useBooking';
import { BookingInput, Duration } from '../../types/index';

/**
 * Available courts (1-6)
 */
const COURTS = [
  { value: 1, label: 'Court 1' },
  { value: 2, label: 'Court 2' },
  { value: 3, label: 'Court 3' },
  { value: 4, label: 'Court 4' },
  { value: 5, label: 'Court 5' },
  { value: 6, label: 'Court 6' },
];

/**
 * Available time slots (30-minute increments from 6:00 AM to 10:00 PM)
 */
const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00',
];

/**
 * Duration options (1 hr or 1.5 hr only)
 */
const DURATION_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 1.5, label: '1.5 hours' },
];

/**
 * Recurrence options
 */
const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Once' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

/**
 * Booking type options
 */
const BOOKING_TYPES = [
  { value: 'singles', label: 'Singles' },
  { value: 'doubles', label: 'Doubles' },
];

/**
 * Validates booking form inputs
 */
function validateBooking(formData: BookingInput): string | null {
  if (formData.preferred_court === 0) {
    return 'Please select a court';
  }
  if (!formData.booking_date) {
    return 'Please select a booking date';
  }
  if (!formData.booking_time) {
    return 'Please select a booking time';
  }
  if (!formData.booking_type) {
    return 'Please select a booking type (Singles or Doubles)';
  }
  if (!formData.duration_hours) {
    return 'Please select a duration';
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

  // Check if date is in the future (timezone-safe comparison)
  const [year, month, day] = formData.booking_date.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    return 'Booking date must be in the future';
  }

  return null;
}

/**
 * Get today's date in YYYY-MM-DD format (timezone-safe)
 */
function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display (e.g., "Nov 7, 2025") - timezone-safe
 */
function formatDateDisplay(dateString: string): string {
  // Parse as local date to avoid timezone issues
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format time for display (e.g., "10:00 PM")
 */
function formatTimeDisplay(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

interface BookingFormScreenProps {
  onBookingSuccess?: () => void;
}

/**
 * BookingFormScreen Component
 */
export default function BookingFormScreen({ onBookingSuccess }: BookingFormScreenProps) {
  const { user } = useAuth();
  const { createBooking, isLoading, error, clearError } = useBooking();

  // Form state
  const [formData, setFormData] = useState<BookingInput>({
    preferred_court: 1,
    accept_any_court: true,
    booking_date: getTodayDateString(),
    booking_time: '10:00',
    booking_type: 'doubles',
    duration_hours: 1.5,
    recurrence: 'once',
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Date picker state (for native platforms)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  /**
   * Clear errors when component mounts
   */
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  /**
   * Show error message
   */
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  /**
   * Show success message
   */
  useEffect(() => {
    if (submitSuccess) {
      Alert.alert('Success', 'Booking task created successfully', [
        {
          text: 'OK',
          onPress: () => {
            setSubmitSuccess(false);
            // Reset form
            setFormData({
              preferred_court: 1,
              accept_any_court: true,
              booking_date: getTodayDateString(),
              booking_time: '10:00',
              booking_type: 'doubles',
              duration_hours: 1.5,
              recurrence: 'once',
            });
            setValidationError(null);
            // Redirect to My Bookings if callback provided
            if (onBookingSuccess) {
              onBookingSuccess();
            }
          },
        },
      ]);
    }
  }, [submitSuccess, onBookingSuccess]);

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
      Alert.alert('Validation Error', error);
      return;
    }

    if (!user?.id) {
      setValidationError('User not authenticated');
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    try {
      await createBooking(user.id, formData);
      setSubmitSuccess(true);
    } catch (err) {
      console.error('Booking creation error:', err);
    }
  };

  /**
   * Handle court selection
   */
  const handleCourtSelect = () => {
    Alert.alert(
      'Select Court',
      undefined,
      [
        ...COURTS.map((court) => ({
          text: court.label,
          onPress: () => setFormData({ ...formData, preferred_court: court.value }),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /**
   * Handle date selection (native picker) - timezone-safe
   */
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      // Use local date components to avoid timezone conversion issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      setFormData({ ...formData, booking_date: dateString });
    }
  };

  /**
   * Handle time selection
   */
  const handleTimeSelect = () => {
    Alert.alert(
      'Select Time',
      undefined,
      [
        ...TIME_SLOTS.map((time) => ({
          text: formatTimeDisplay(time),
          onPress: () => setFormData({ ...formData, booking_time: time }),
        })),
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  /**
   * Handle booking type selection
   */
  const handleBookingTypeSelect = () => {
    Alert.alert(
      'Select Booking Type',
      undefined,
      [
        ...BOOKING_TYPES.map((type) => ({
          text: type.label,
          onPress: () => setFormData({ ...formData, booking_type: type.value as 'singles' | 'doubles' }),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /**
   * Handle duration selection
   */
  const handleDurationSelect = () => {
    Alert.alert(
      'Select Duration',
      undefined,
      [
        ...DURATION_OPTIONS.map((duration) => ({
          text: duration.label,
          onPress: () => setFormData({ ...formData, duration_hours: duration.value as Duration }),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /**
   * Handle recurrence selection
   */
  const handleRecurrenceSelect = () => {
    Alert.alert(
      'Select Recurrence',
      undefined,
      [
        ...RECURRENCE_OPTIONS.map((rec) => ({
          text: rec.label,
          onPress: () => setFormData({ ...formData, recurrence: rec.value as any }),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Court Selection */}
        <TouchableOpacity style={styles.row} onPress={handleCourtSelect}>
          <ThemedText style={styles.label}>Court</ThemedText>
          <View style={styles.valueContainer}>
            <ThemedText style={[styles.value, formData.preferred_court > 0 && styles.valueSelected]}>
              {formData.preferred_court > 0 ? `Court ${formData.preferred_court}` : 'Select...'}
            </ThemedText>
            <ThemedText style={styles.chevron}>›</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Accept Any Court */}
        <View style={styles.row}>
          <ThemedText style={styles.label}>Accept Any Court</ThemedText>
          <Checkbox
            value={formData.accept_any_court}
            onValueChange={(value) => setFormData({ ...formData, accept_any_court: value })}
            color={formData.accept_any_court ? '#007AFF' : undefined}
          />
        </View>

        {/* Date Selection */}
        <TouchableOpacity style={styles.row} onPress={() => setShowDatePicker(true)}>
          <ThemedText style={styles.label}>Date</ThemedText>
          <View style={styles.valueContainer}>
            <ThemedText style={[styles.value, styles.valueSelected]}>
              {formatDateDisplay(formData.booking_date)}
            </ThemedText>
            <ThemedText style={styles.chevron}>›</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Date Picker (Native) */}
        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={(() => {
                // Parse date string as local date to avoid timezone issues
                const [year, month, day] = formData.booking_date.split('-').map(Number);
                return new Date(year, month - 1, day);
              })()}
              mode="date"
              display="inline"
              onChange={handleDateChange}
              minimumDate={new Date()}
              themeVariant="light"
            />
          </View>
        )}

        {/* Time Selection */}
        <TouchableOpacity style={styles.row} onPress={handleTimeSelect}>
          <ThemedText style={styles.label}>Time</ThemedText>
          <View style={styles.valueContainer}>
            <ThemedText style={[styles.value, styles.valueSelected]}>
              {formatTimeDisplay(formData.booking_time)}
            </ThemedText>
            <ThemedText style={styles.chevron}>›</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Booking Type Selection */}
        <TouchableOpacity style={styles.row} onPress={handleBookingTypeSelect}>
          <ThemedText style={styles.label}>Type</ThemedText>
          <View style={styles.valueContainer}>
            <ThemedText style={[styles.value, styles.valueSelected]}>
              {BOOKING_TYPES.find(t => t.value === formData.booking_type)?.label}
            </ThemedText>
            <ThemedText style={styles.chevron}>›</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Duration Selection */}
        <TouchableOpacity style={styles.row} onPress={handleDurationSelect}>
          <ThemedText style={styles.label}>Duration</ThemedText>
          <View style={styles.valueContainer}>
            <ThemedText style={[styles.value, styles.valueSelected]}>
              {DURATION_OPTIONS.find(d => d.value === formData.duration_hours)?.label}
            </ThemedText>
            <ThemedText style={styles.chevron}>›</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Recurrence Selection */}
        <TouchableOpacity style={styles.row} onPress={handleRecurrenceSelect}>
          <ThemedText style={styles.label}>Recurrence</ThemedText>
          <View style={styles.valueContainer}>
            <ThemedText style={[styles.value, styles.valueSelected]}>
              {RECURRENCE_OPTIONS.find(r => r.value === formData.recurrence)?.label}
            </ThemedText>
            <ThemedText style={styles.chevron}>›</ThemedText>
          </View>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <ThemedText style={styles.submitButtonText}>Create Booking</ThemedText>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 1,
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    color: '#000',
    fontWeight: '400',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 16,
    color: '#999',
    marginRight: 8,
  },
  valueSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  chevron: {
    fontSize: 24,
    color: '#C7C7CC',
    fontWeight: '300',
  },
  datePickerContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
