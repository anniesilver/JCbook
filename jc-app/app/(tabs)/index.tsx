import { StyleSheet, TouchableOpacity, Alert, View, ScrollView } from 'react-native';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useBookingStore } from '@/store/bookingStore';

export default function HomeScreen() {
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();
  const { bookings } = useBookingStore();

  // Calculate pending bookings
  const pendingBookings = bookings.filter(
    b => b.status === 'pending' || b.auto_book_status === 'pending'
  );

  // Get next booking by date (not execution time - server handles scheduling)
  const nextBooking = pendingBookings
    .sort((a, b) => {
      const [yearA, monthA, dayA] = a.booking_date.split('-').map(Number);
      const [yearB, monthB, dayB] = b.booking_date.split('-').map(Number);
      const dateA = new Date(yearA, monthA - 1, dayA);
      const dateB = new Date(yearB, monthB - 1, dayB);
      return dateA.getTime() - dateB.getTime();
    })[0];

  const nextBookingDate = nextBooking
    ? `${nextBooking.booking_date} at ${nextBooking.booking_time}`
    : 'None';

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Logout',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch (error) {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.content}>
        <ThemedView style={styles.titleContainer}>
          <ThemedText type="title">JC Court Booking</ThemedText>
        </ThemedView>

        {/* Server Status Card */}
        <ThemedView style={styles.executorCard}>
          <ThemedText type="subtitle" style={styles.executorTitle}>
            Booking Status
          </ThemedText>

          <View style={styles.statusRow}>
            <ThemedText style={styles.statusLabel}>Execution:</ThemedText>
            <ThemedText style={styles.statusValue}>
              PC Server
            </ThemedText>
          </View>

          <View style={styles.statusRow}>
            <ThemedText style={styles.statusLabel}>Pending:</ThemedText>
            <ThemedText style={styles.statusValue}>{pendingBookings.length}</ThemedText>
          </View>

          <View style={styles.statusRow}>
            <ThemedText style={styles.statusLabel}>Next booking:</ThemedText>
            <ThemedText style={styles.statusValue} numberOfLines={2}>
              {nextBookingDate}
            </ThemedText>
          </View>

          {pendingBookings.length > 0 && (
            <View style={styles.infoBox}>
              <ThemedText style={styles.infoText}>
                Bookings are executed automatically by the Windows PC server
              </ThemedText>
            </View>
          )}
        </ThemedView>

        <ThemedView style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={isLoading}>
            <ThemedText style={styles.logoutButtonText}>
              {isLoading ? 'Logging out...' : 'Logout'}
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  titleContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  executorCard: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  executorTitle: {
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '500',
  },
  logoutContainer: {
    gap: 8,
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
