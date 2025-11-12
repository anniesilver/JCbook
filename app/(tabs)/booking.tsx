/**
 * Booking Tab Route
 * Main container for booking form and history management
 * Allows navigation between creating bookings and viewing booking history
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Info Banner for Pending Bookings */}
      {hasPendingBookings && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoText}>
            ℹ️ Bookings will be executed automatically on booking server at the earliest posible booking time
          </Text>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            viewMode === 'form' && styles.tabButtonActive,
          ]}
          onPress={() => {
            console.log('Switching to form view');
            setViewMode('form');
          }}
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
          onPress={() => {
            console.log('Switching to history view');
            setViewMode('history');
          }}
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
      <View style={styles.viewContainer} key={viewMode}>
        {viewMode === 'form' ? (
          <BookingFormScreen
            onBookingSuccess={() => setViewMode('history')}
          />
        ) : (
          <BookingHistoryScreen
            showCloseButton={false}
            onClose={() => setViewMode('form')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  infoBanner: {
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
    padding: 12,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    textAlign: 'center',
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
