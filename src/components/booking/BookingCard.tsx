/**
 * Booking Card Component
 * Displays a single booking with status, details, and action buttons
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBadge } from './StatusBadge';
import { Booking } from '../../types/index';

interface BookingCardProps {
  booking: Booking;
  onRetry?: (bookingId: string) => Promise<void>;
  onCancel?: (bookingId: string) => Promise<void>;
  onDelete?: (bookingId: string) => Promise<void>;
  onViewDetails?: (booking: Booking) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onRetry,
  onCancel,
  onDelete,
  onViewDetails,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;

    Alert.alert(
      'Retry Booking',
      `Retry booking for Court ${booking.preferred_court} on ${booking.booking_date}?`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Retry',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onRetry(booking.id);
              Alert.alert('Success', 'Booking retry initiated');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to retry booking'
              );
            } finally {
              setIsLoading(false);
            }
          },
          style: 'default',
        },
      ]
    );
  };

  const handleCancel = async () => {
    if (!onCancel) return;

    Alert.alert(
      'Cancel Booking',
      `Cancel booking for Court ${booking.preferred_court} on ${booking.booking_date}?`,
      [
        {
          text: 'No',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onCancel(booking.id);
              Alert.alert('Success', 'Booking cancelled');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to cancel booking'
              );
            } finally {
              setIsLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    Alert.alert(
      'Delete Booking',
      `Delete booking for Court ${booking.preferred_court} on ${booking.booking_date}?`,
      [
        {
          text: 'No',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Yes, Delete',
          onPress: async () => {
            setIsLoading(true);
            try {
              await onDelete(booking.id);
              Alert.alert('Success', 'Booking deleted');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete booking'
              );
            } finally {
              setIsLoading(false);
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const statusMap: Record<string, 'pending' | 'in_progress' | 'success' | 'failed'> = {
    pending: 'pending',
    in_progress: 'in_progress',
    success: 'success',
    failed: 'failed',
  };

  const status = statusMap[booking.auto_book_status] || 'pending';

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onViewDetails?.(booking)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.courtName}>Court {booking.preferred_court}</Text>
          <Text style={styles.dateTime}>
            {booking.booking_date} at {booking.booking_time}
          </Text>
        </View>
        <StatusBadge status={status} size="small" />
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{booking.booking_type}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.detailValue}>{booking.duration_hours} hour{booking.duration_hours > 1 ? 's' : ''}</Text>
        </View>
        {booking.auto_book_status === 'confirmed' && booking.gametime_confirmation_id && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Confirmation:</Text>
            <Text style={styles.detailValue}>{booking.gametime_confirmation_id}</Text>
          </View>
        )}
        {booking.auto_book_status === 'failed' && booking.error_message && (
          <View style={styles.errorRow}>
            <Text style={styles.errorLabel}>Error:</Text>
            <Text style={styles.errorValue}>{booking.error_message}</Text>
          </View>
        )}
      </View>

      {(status === 'failed' || status === 'pending') && (
        <View style={styles.actionButtons}>
          {status === 'failed' && onRetry && (
            <TouchableOpacity
              style={[styles.button, styles.retryButton]}
              onPress={handleRetry}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0066CC" />
              ) : (
                <Text style={styles.retryButtonText}>Retry</Text>
              )}
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity
              style={styles.deleteIconButton}
              onPress={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#DC3545" />
              ) : (
                <Text style={styles.deleteIcon}>🗑️</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  courtName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F1F1F',
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: '#666',
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  errorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: '#F8D7DA',
    borderRadius: 6,
    padding: 8,
  },
  errorLabel: {
    fontSize: 12,
    color: '#DC3545',
    fontWeight: '600',
  },
  errorValue: {
    fontSize: 12,
    color: '#DC3545',
    flex: 1,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#D6E9FF',
    borderWidth: 1,
    borderColor: '#0066CC',
  },
  retryButtonText: {
    color: '#0066CC',
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: '#F8D7DA',
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  cancelButtonText: {
    color: '#DC3545',
    fontWeight: '600',
    fontSize: 14,
  },
  deleteIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8D7DA',
    borderWidth: 1,
    borderColor: '#DC3545',
  },
  deleteIcon: {
    fontSize: 20,
    lineHeight: 20,
  },
});
