import { Image } from 'expo-image';
import { Platform, StyleSheet, TouchableOpacity, Alert, View } from 'react-native';
import { useEffect, useState } from 'react';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useBookingExecutor } from '@/hooks/useBookingExecutor';
import { useBookingStore } from '@/store/bookingStore';
import { isBookingExecutorRunning } from '@/services/bookingExecutor';

export default function HomeScreen() {
  const router = useRouter();
  const { logout, user, isLoading } = useAuth();
  const { bookings } = useBookingStore();
  const [countdown, setCountdown] = useState(60);

  // NOTE: Booking execution is now handled by the Windows PC server
  // See: backend-server/README.md for setup instructions
  // The mobile app only displays booking status - the server executes them
  // useBookingExecutor(); // DISABLED - Server handles execution

  // Calculate pending bookings and next execution time
  const pendingBookings = bookings.filter(
    b => b.status === 'pending' || b.auto_book_status === 'pending'
  );

  const nextBooking = pendingBookings
    .sort((a, b) =>
      new Date(a.scheduled_execute_time || 0).getTime() -
      new Date(b.scheduled_execute_time || 0).getTime()
    )[0];

  const nextExecutionTime = nextBooking
    ? new Date(nextBooking.scheduled_execute_time!).toLocaleString()
    : 'None';

  // Countdown timer for next check
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 60;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      {/* Server Status Card */}
      <ThemedView style={styles.executorCard}>
        <ThemedText type="subtitle" style={styles.executorTitle}>
          Booking Automation Server
        </ThemedText>

        <View style={styles.statusRow}>
          <ThemedText style={styles.statusLabel}>Execution:</ThemedText>
          <ThemedText style={styles.statusValue}>
            Windows PC Server
          </ThemedText>
        </View>

        <View style={styles.statusRow}>
          <ThemedText style={styles.statusLabel}>Pending bookings:</ThemedText>
          <ThemedText style={styles.statusValue}>{pendingBookings.length}</ThemedText>
        </View>

        <View style={styles.statusRow}>
          <ThemedText style={styles.statusLabel}>Next execution:</ThemedText>
          <ThemedText style={styles.statusValue} numberOfLines={2}>
            {nextExecutionTime}
          </ThemedText>
        </View>

        {pendingBookings.length > 0 && (
          <View style={styles.warningBox}>
            <ThemedText style={styles.warningText}>
              Bookings will be executed automatically by the Windows PC server at C:\ANNIE-PROJECT\jc\backend-server
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
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  statusActive: {
    color: '#4CAF50',
  },
  statusInactive: {
    color: '#9E9E9E',
  },
  warningBox: {
    backgroundColor: '#FFF3CD',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
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
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
