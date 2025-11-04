/**
 * Booking Tab Route
 * Main container for booking form and history management
 * Allows navigation between creating bookings and viewing booking history
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BookingFormScreen from '../../src/screens/booking/BookingFormScreen';
import { BookingHistoryScreen } from '../../src/screens/booking/BookingHistoryScreen';
import { useBookingStore } from '../../src/store/bookingStore';

type BookingViewMode = 'form' | 'history';

export default function BookingTabScreen() {
  const [viewMode, setViewMode] = useState<BookingViewMode>('form');
  const { bookings } = useBookingStore();

  // Check if there are any pending bookings
  const hasPendingBookings = bookings.some(
    (b) => b.status === 'pending' || b.auto_book_status === 'pending'
  );

  // Find the next execution time
  const nextExecution = bookings
    .filter((b) => b.status === 'pending' || b.auto_book_status === 'pending')
    .sort((a, b) => new Date(a.scheduled_execute_time).getTime() - new Date(b.scheduled_execute_time).getTime())[0];

  const nextExecutionTime = nextExecution
    ? new Date(nextExecution.scheduled_execute_time).toLocaleString()
    : '';

  return (
    <View style={styles.container}>
      {/* Warning Banner for Pending Bookings */}
      {hasPendingBookings && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningTitle}>⚠️ IMPORTANT: Keep app open for automatic booking</Text>
          <Text style={styles.warningText}>📱 Do not close app until {nextExecutionTime}</Text>
          <Text style={styles.warningText}>🔋 Keep device charged and connected to internet</Text>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            viewMode === 'form' && styles.tabButtonActive,
          ]}
          onPress={() => setViewMode('form')}
        >
          <Text
            style={[
              styles.tabButtonText,
              viewMode === 'form' && styles.tabButtonTextActive,
            ]}
          >
            Create Booking
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            viewMode === 'history' && styles.tabButtonActive,
          ]}
          onPress={() => setViewMode('history')}
        >
          <Text
            style={[
              styles.tabButtonText,
              viewMode === 'history' && styles.tabButtonTextActive,
            ]}
          >
            My Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {/* View Container */}
      <View style={styles.viewContainer}>
        {viewMode === 'form' && (
          <BookingFormScreen
            onBookingSuccess={() => setViewMode('history')}
          />
        )}
        {viewMode === 'history' && (
          <BookingHistoryScreen
            showCloseButton={false}
            onClose={() => setViewMode('form')}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 2,
    borderBottomColor: '#FFC107',
    padding: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    marginTop: 2,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#0066CC',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  tabButtonTextActive: {
    color: '#0066CC',
  },
  viewContainer: {
    flex: 1,
  },
});
