/**
 * Booking History Screen
 * Displays all user bookings with filtering and management capabilities
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useBookingStore } from '../../store/bookingStore';
import { BookingCard } from '../../components/booking/BookingCard';
import { Booking } from '../../types/index';

type FilterType = 'all' | 'pending' | 'success' | 'failed' | 'in_progress';

interface BookingHistoryScreenProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const BookingHistoryScreen: React.FC<BookingHistoryScreenProps> = ({
  onClose,
  showCloseButton = false,
}) => {
  const { bookings, isLoading, loadUserBookings, retryBooking, cancelBooking, deleteBooking } =
    useBookingStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');

  useEffect(() => {
    loadUserBookings();
    // Only load on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getFilteredBookings = (): Booking[] => {
    // Create a copy to avoid mutating immer-wrapped array from store
    let filtered = [...bookings];

    if (filter !== 'all') {
      filtered = filtered.filter((b) => b.auto_book_status === filter);
    }

    // Sort bookings (timezone-safe date comparison)
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        // Parse dates as local dates to avoid timezone issues
        const [yearA, monthA, dayA] = a.booking_date.split('-').map(Number);
        const [yearB, monthB, dayB] = b.booking_date.split('-').map(Number);
        const dateA = new Date(yearA, monthA - 1, dayA);
        const dateB = new Date(yearB, monthB - 1, dayB);
        return dateB.getTime() - dateA.getTime();
      } else {
        // Sort by status priority
        const statusPriority: Record<string, number> = {
          in_progress: 1,
          pending: 2,
          failed: 3,
          success: 4,
        };
        return (statusPriority[a.auto_book_status] || 5) -
          (statusPriority[b.auto_book_status] || 5);
      }
    });
  };

  const filteredBookings = getFilteredBookings();

  const handleRetry = async (bookingId: string) => {
    try {
      await retryBooking(bookingId);
      Alert.alert('Success', 'Booking retry initiated');
      await loadUserBookings();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to retry booking'
      );
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      await cancelBooking(bookingId);
      Alert.alert('Success', 'Booking cancelled');
      await loadUserBookings();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to cancel booking'
      );
    }
  };

  const handleDelete = async (bookingId: string) => {
    try {
      await deleteBooking(bookingId);
      await loadUserBookings();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to delete booking'
      );
    }
  };

  const getStatistics = () => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.auto_book_status === 'pending').length,
      in_progress: bookings.filter((b) => b.auto_book_status === 'in_progress').length,
      success: bookings.filter((b) => b.auto_book_status === 'success').length,
      failed: bookings.filter((b) => b.auto_book_status === 'failed').length,
    };
  };

  const stats = getStatistics();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>My Bookings</Text>
          <Text style={styles.subtitle}>
            {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
          </Text>
        </View>
        {showCloseButton && onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>


      {/* Filter and Sort Options */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
          {(['all', 'pending', 'confirmed', 'failed'] as FilterType[]).map((f) => {
            let count = bookings.length;
            if (f === 'all') {
              count = bookings.length;
            } else if (f === 'pending') {
              count = stats.pending;
            } else if (f === 'confirmed') {
              count = stats.confirmed;
            } else if (f === 'failed') {
              count = stats.failed;
            }

            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterTab,
                  filter === f && styles.filterTabActive,
                ]}
                onPress={() => setFilter(f)}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    filter === f && styles.filterTabTextActive,
                  ]}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'date' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('date')}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'date' && styles.sortButtonTextActive,
              ]}
            >
              Date
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              sortBy === 'status' && styles.sortButtonActive,
            ]}
            onPress={() => setSortBy('status')}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === 'status' && styles.sortButtonTextActive,
              ]}
            >
              Status
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bookings List */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      ) : filteredBookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            {bookings.length === 0 ? 'No bookings yet' : 'No bookings match this filter'}
          </Text>
          {bookings.length === 0 && (
            <Text style={styles.emptySubtext}>Create a booking to get started</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onRetry={handleRetry}
              onCancel={handleCancel}
              onDelete={handleDelete}
              onViewDetails={() => {
                // Could show a detailed view modal here
                Alert.alert(
                  'Booking Details',
                  `Court: ${item.preferred_court}\nDate: ${item.booking_date}\nTime: ${item.booking_time}\nType: ${item.booking_type}\nDuration: ${item.duration_hours} hour(s)\nStatus: ${item.auto_book_status}`
                );
              }}
            />
          )}
          scrollEnabled={true}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
    fontWeight: 'bold',
  },
  controlsContainer: {
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterTabs: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#0066CC',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFF',
  },
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sortButtonActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: '#FFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCC',
  },
});
