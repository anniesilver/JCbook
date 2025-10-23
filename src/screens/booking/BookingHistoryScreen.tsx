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

type FilterType = 'all' | 'pending' | 'confirmed' | 'failed' | 'processing';

interface BookingHistoryScreenProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export const BookingHistoryScreen: React.FC<BookingHistoryScreenProps> = ({
  onClose,
  showCloseButton = false,
}) => {
  const { bookings, isLoading, loadUserBookings, retryBooking, cancelBooking } =
    useBookingStore();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');

  useEffect(() => {
    loadUserBookings();
  }, []);

  const getFilteredBookings = (): Booking[] => {
    let filtered = bookings;

    if (filter !== 'all') {
      filtered = filtered.filter((b) => b.auto_book_status === filter);
    }

    // Sort bookings
    return filtered.sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
      } else {
        // Sort by status priority
        const statusPriority: Record<string, number> = {
          processing: 1,
          pending: 2,
          failed: 3,
          confirmed: 4,
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

  const getStatistics = () => {
    return {
      total: bookings.length,
      pending: bookings.filter((b) => b.auto_book_status === 'pending').length,
      processing: bookings.filter((b) => b.auto_book_status === 'processing').length,
      confirmed: bookings.filter((b) => b.auto_book_status === 'confirmed').length,
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

      {/* Statistics */}
      {bookings.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statCard, styles.pendingCard]}>
            <Text style={styles.statNumber}>{stats.pending}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, styles.processingCard]}>
            <Text style={styles.statNumber}>{stats.processing}</Text>
            <Text style={styles.statLabel}>Processing</Text>
          </View>
          <View style={[styles.statCard, styles.confirmedCard]}>
            <Text style={styles.statNumber}>{stats.confirmed}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={[styles.statCard, styles.failedCard]}>
            <Text style={styles.statNumber}>{stats.failed}</Text>
            <Text style={styles.statLabel}>Failed</Text>
          </View>
        </ScrollView>
      )}

      {/* Filter and Sort Options */}
      <View style={styles.controlsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
          {(['all', 'pending', 'confirmed', 'failed'] as FilterType[]).map((f) => (
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
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
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
              onViewDetails={() => {
                // Could show a detailed view modal here
                Alert.alert(
                  'Booking Details',
                  `Court: ${item.court}\nDate: ${item.booking_date}\nTime: ${item.booking_time}\nType: ${item.booking_type}\nDuration: ${item.duration}\nStatus: ${item.auto_book_status}`
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
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
  },
  statCard: {
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    minWidth: 70,
    alignItems: 'center',
  },
  pendingCard: {
    backgroundColor: '#FFF3CD',
  },
  processingCard: {
    backgroundColor: '#D6E9FF',
  },
  confirmedCard: {
    backgroundColor: '#D4EDDA',
  },
  failedCard: {
    backgroundColor: '#F8D7DA',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
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
