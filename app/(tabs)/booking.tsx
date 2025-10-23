/**
 * Booking Tab Route
 * Main container for booking form and history management
 * Allows navigation between creating bookings and viewing booking history
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BookingFormScreen from '../../src/screens/booking/BookingFormScreen';
import { BookingHistoryScreen } from '../../src/screens/booking/BookingHistoryScreen';

type BookingViewMode = 'form' | 'history';

export default function BookingTabScreen() {
  const [viewMode, setViewMode] = useState<BookingViewMode>('form');

  return (
    <View style={styles.container}>
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
        {viewMode === 'form' && <BookingFormScreen />}
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
