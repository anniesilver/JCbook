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
  CheckBox,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ThemedText } from '../../components/themed-text';
import { ThemedView } from '../../components/themed-view';
import { useAuth } from '../../hooks/useAuth';
import { useBooking } from '../../hooks/useBooking';
import { BookingRecurrence, BookingInput, Duration } from '../../types/index';

// Web-only date input component
const WebDateInput: React.FC<{
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: any;
}> = ({ value, onChangeText, placeholder, style }) => {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChangeText(e.target.value)}
      placeholder={placeholder}
      style={{
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 10,
        paddingBottom: 10,
        fontSize: 16,
        color: '#000',
        backgroundColor: '#FFF',
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
        ...style
      } as React.CSSProperties}
      min={new Date().toISOString().split('T')[0]}
    />
  );
};

/**
 * List of available courts (1-6)
 */
const COURTS = [
  { value: 0, label: 'Select a court...' },
  { value: 1, label: 'Court 1' },
  { value: 2, label: 'Court 2' },
  { value: 3, label: 'Court 3' },
  { value: 4, label: 'Court 4' },
  { value: 5, label: 'Court 5' },
  { value: 6, label: 'Court 6' },
];

/**
 * Available time slots (30-minute increments from 6:00 AM to 10:30 PM)
 */
const TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30', '22:00', '22:30',
];

/**
 * Duration options (1 hr or 1.5 hr only)
 */
const DURATION_OPTIONS: Duration[] = [1, 1.5];

/**
 * Recurrence options
 */
const RECURRENCE_OPTIONS = [
  { value: BookingRecurrence.ONCE, label: 'Once' },
  { value: BookingRecurrence.WEEKLY, label: 'Weekly' },
  { value: BookingRecurrence.BI_WEEKLY, label: 'Bi-Weekly' },
  { value: BookingRecurrence.MONTHLY, label: 'Monthly' },
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
    preferred_court: 0,
    accept_any_court: false,
    booking_date: getTodayDateString(),
    booking_time: '10:00',
    booking_type: 'singles',
    duration_hours: 1,
    recurrence: BookingRecurrence.ONCE,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(getTodayDateString()));

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
      Alert.alert('Success', 'Booking created successfully! The system will automatically submit your booking at 8:00 AM on the scheduled date.', [
        {
          text: 'OK',
          onPress: () => {
            setSubmitSuccess(false);
            // Reset form
            setFormData({
              preferred_court: 0,
              accept_any_court: false,
              booking_date: getTodayDateString(),
              booking_time: '10:00',
              booking_type: 'singles',
              duration_hours: 1,
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
   * Handle date picker changes
   */
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      // Format date to YYYY-MM-DD
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      setFormData({ ...formData, booking_date: formattedDate });
    }
  };

  /**
   * Handle form reset
   */
  const handleReset = () => {
    const today = new Date();
    setFormData({
      preferred_court: 0,
      accept_any_court: false,
      booking_date: getTodayDateString(),
      booking_time: '10:00',
      booking_type: 'singles',
      duration_hours: 1,
      recurrence: BookingRecurrence.ONCE,
    });
    setSelectedDate(today);
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
          <ThemedText style={styles.label}>Preferred Court</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.preferred_court}
              onValueChange={(value) => setFormData({ ...formData, preferred_court: value })}
              style={styles.picker}
            >
              {COURTS.map((court) => (
                <Picker.Item key={court.value} label={court.label} value={court.value} />
              ))}
            </Picker>
          </View>
          <View style={styles.checkboxRow}>
            <CheckBox
              value={formData.accept_any_court}
              onValueChange={(value) => setFormData({ ...formData, accept_any_court: value })}
              style={styles.checkbox}
            />
            <ThemedText style={styles.checkboxLabel}>
              Accept any available court if preferred is taken
            </ThemedText>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Booking Date</ThemedText>

          {Platform.OS === 'web' ? (
            // Web: Use native HTML5 date input element
            <WebDateInput
              value={formData.booking_date}
              onChangeText={(text) => {
                setFormData({ ...formData, booking_date: text });
                if (text && /^\d{4}-\d{2}-\d{2}$/.test(text)) {
                  setSelectedDate(new Date(text));
                }
              }}
              placeholder="YYYY-MM-DD"
            />
          ) : (
            // Native: Use DateTimePicker with button
            <>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText style={styles.dateButtonText}>
                  {formData.booking_date} (Tap to change)
                </ThemedText>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              {Platform.OS === 'ios' && showDatePicker && (
                <TouchableOpacity
                  style={styles.datePickerConfirm}
                  onPress={() => setShowDatePicker(false)}
                >
                  <ThemedText style={styles.datePickerConfirmText}>Done</ThemedText>
                </TouchableOpacity>
              )}
            </>
          )}
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
          <ThemedText style={styles.label}>Booking Type</ThemedText>
          <View style={styles.radioGroup}>
            {BOOKING_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={styles.radioOption}
                onPress={() => setFormData({ ...formData, booking_type: type.value as any })}
              >
                <View style={[styles.radio, formData.booking_type === type.value && styles.radioSelected]} />
                <ThemedText>{type.label}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText style={styles.label}>Duration</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.duration_hours}
              onValueChange={(value) => setFormData({ ...formData, duration_hours: value })}
              style={styles.picker}
            >
              {DURATION_OPTIONS.map((duration) => (
                <Picker.Item key={duration} label={`${duration} hour${duration > 1 ? 's' : ''}`} value={duration} />
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
              {formData.preferred_court > 0 ? `Court ${formData.preferred_court}` : 'Not selected'}
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>Accept Any Court:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {formData.accept_any_court ? 'Yes' : 'No'}
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
            <ThemedText style={styles.summaryLabel}>Type:</ThemedText>
            <ThemedText style={styles.summaryValue}>
              {formData.booking_type.charAt(0).toUpperCase() + formData.booking_type.slice(1)}
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>Duration:</ThemedText>
            <ThemedText style={styles.summaryValue}>{formData.duration_hours} hour(s)</ThemedText>
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
              <ThemedText style={styles.submitButtonText}>Schedule Booking</ThemedText>
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
  webDateInput: {
    // Web-specific styling for date input
    paddingVertical: 12,
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
  dateButton: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  datePickerConfirm: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  datePickerConfirmText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
  },
  checkboxLabel: {
    fontSize: 14,
    flex: 1,
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 20,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
  },
  radioSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
});
