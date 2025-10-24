/**
 * GameTime API Service
 * Handles real integration with GameTime.net tennis court booking system
 *
 * API Documentation: See GAMETIME_API_RESEARCH.md
 */

import axios, { AxiosInstance } from 'axios';

/**
 * GameTime court data response
 */
export interface GameTimeCourtData {
  q: number;  // Starting quarter hour (360 = 6 AM)
  c: number;  // Total minutes in day (1380 = 9 PM)
  g: {
    s: string;
    g: Array<{
      court: number;
      c: string;
      g: string;
      n: string;
    }>;
  };
  e: GameTimeCourt[];  // Courts array
  m: Record<string, GameTimeBookingMetadata>;  // Metadata
}

export interface GameTimeCourt {
  n: string;  // Court name
  mn: string;  // Court number
  i: string;  // Court ID
  t: GameTimeSlot[];  // Time slots
  b: GameTimeBooking[];  // Bookings
}

export interface GameTimeSlot {
  t: number;  // Start time in minutes
  d: number;  // Duration in minutes
  i?: number;  // Interval in minutes
}

export interface GameTimeBooking {
  t: number;  // Start time
  d: number;  // Duration
  c?: number;  // Confirmation/Booking ID
  bkId: number;  // Booking ID
  m?: number;  // Member type ID
  i?: string;  // Special indicator
  p?: Array<{  // Players
    n: string;
    u?: number;
    o: number;
    club?: string;
  }>;
  j?: string;  // Instructor
  [key: string]: any;
}

export interface GameTimeBookingMetadata {
  conf_id: number;
  c: string;  // Color code
  d?: string;  // Description
  inst_id: null;
  eventid: null;
  instructors: any[];
  fees: any[];
  ageLimit: string;
  time: string;
  date: string;
  duration: string;
}

export interface AvailableSlot {
  courtNumber: number;
  courtName: string;
  startTime: string;  // HH:MM format
  endTime: string;  // HH:MM format
  durationMinutes: number;
  available: boolean;
}

/**
 * GameTime API Service
 * Handles authentication and booking operations with GameTime.net
 */
export class GameTimeApiService {
  private baseUrl: string = 'https://jct.gametime.net';
  private client: AxiosInstance;
  private isAuthenticated: boolean = false;

  constructor() {
    this.client = axios.create({
      baseURL: this.baseUrl,
      withCredentials: true,  // Send cookies with requests
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  }

  /**
   * Convert minutes from 6 AM to HH:MM format
   * 360 minutes = 6:00 AM, 420 = 7:00 AM, etc.
   */
  private minutesToTime(minutes: number): string {
    const baseHour = 6;
    const totalMinutes = baseHour * 60 + minutes;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Login to GameTime with credentials
   * @param username GameTime username/email
   * @param password GameTime password
   * @returns true if successful
   */
  async login(username: string, password: string): Promise<boolean> {
    try {
      console.log('[GameTime] Attempting login with username:', username);

      // Submit login form
      const response = await this.client.post('/auth',
        `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Check if login was successful
      // GameTime redirects to dashboard on success, returns to auth page on failure
      if (response.status === 200 && response.request.responseURL.includes('/scheduling')) {
        this.isAuthenticated = true;
        console.log('[GameTime] Login successful');
        return true;
      }

      console.error('[GameTime] Login failed - invalid credentials or API changed');
      return false;
    } catch (error) {
      console.error('[GameTime] Login error:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Fetch court availability for a specific date
   * @param date Date in YYYY-MM-DD format
   * @returns Court data with bookings and available slots
   */
  async getCourtAvailability(date: string): Promise<GameTimeCourtData | null> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      console.log('[GameTime] Fetching court availability for date:', date);

      const response = await this.client.get<GameTimeCourtData>(
        `/scheduling/index/jsoncourtdata/sport/1/date/${date}`
      );

      console.log('[GameTime] Court data received');
      return response.data;
    } catch (error) {
      console.error('[GameTime] Error fetching court data:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Parse available time slots from court data
   * Compares time slots with existing bookings to find gaps
   * @param courtData Raw court data from API
   * @param date Date in YYYY-MM-DD format
   * @returns Array of available slots
   */
  parseAvailableSlots(courtData: GameTimeCourtData, date: string): AvailableSlot[] {
    const slots: AvailableSlot[] = [];

    if (!courtData.e || courtData.e.length === 0) {
      console.warn('[GameTime] No courts found in response');
      return slots;
    }

    // Process each court
    courtData.e.forEach((court, courtIndex) => {
      const courtNumber = parseInt(court.mn);
      const courtName = court.n;

      if (!court.t || court.t.length === 0) {
        console.warn(`[GameTime] No time slots for ${courtName}`);
        return;
      }

      // Get all booked times
      const bookedTimes = new Set<number>();
      if (court.b && court.b.length > 0) {
        court.b.forEach((booking) => {
          // Mark all minutes as booked
          for (let i = 0; i < booking.d; i++) {
            bookedTimes.add(booking.t + i);
          }
        });
      }

      // Generate available slots based on intervals
      const timeSlot = court.t[0];  // Get first time slot (should be daily schedule)
      if (timeSlot) {
        const startTime = timeSlot.t;
        const endTime = startTime + timeSlot.d;
        const interval = timeSlot.i || 30;  // Default to 30-minute slots

        // Create slots for each interval
        for (let minutes = startTime; minutes < endTime; minutes += interval) {
          const slotEndTime = minutes + interval;

          // Check if this entire slot is available (no bookings overlap)
          let isAvailable = true;
          for (let i = minutes; i < slotEndTime; i++) {
            if (bookedTimes.has(i)) {
              isAvailable = false;
              break;
            }
          }

          if (isAvailable) {
            slots.push({
              courtNumber,
              courtName,
              startTime: this.minutesToTime(minutes - startTime),
              endTime: this.minutesToTime(slotEndTime - startTime),
              durationMinutes: interval,
              available: true,
            });
          }
        }
      }
    });

    console.log(`[GameTime] Found ${slots.length} available slots for ${date}`);
    return slots;
  }

  /**
   * Submit a booking to GameTime
   *
   * NOTE: This function structures the booking request but the actual endpoint
   * discovery is still pending. This will be updated once we identify the
   * exact POST endpoint and required fields.
   *
   * @param courtNumber Court number (1-6)
   * @param date Date in YYYY-MM-DD format
   * @param startTime Start time in HH:MM format (24-hour)
   * @param durationMinutes Duration in minutes
   * @param numberOfPlayers Number of players
   * @returns Confirmation ID if successful, null if failed
   */
  async submitBooking(
    courtNumber: number,
    date: string,
    startTime: string,
    durationMinutes: number,
    numberOfPlayers: number = 2
  ): Promise<{ confirmationId: string; actualCourt: number } | null> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      console.log(
        `[GameTime] Submitting booking: Court ${courtNumber}, ${date} at ${startTime}, ${durationMinutes} min, ${numberOfPlayers} players`
      );

      // Convert start time to minutes for API
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = (hours - 6) * 60 + minutes;  // Convert to minutes from 6 AM

      // TODO: Discover the actual booking submission endpoint
      // This is a placeholder structure based on common web form patterns
      const bookingData = {
        court: courtNumber,
        date: date,
        time: startMinutes,
        duration: durationMinutes,
        players: numberOfPlayers,
        // Additional fields may be required - will be updated after endpoint discovery
      };

      // PLACEHOLDER: Actual endpoint needs to be discovered
      // Expected POST endpoint: /scheduling/index/submitbooking or similar
      const response = await this.client.post(
        '/scheduling/index/submitbooking',  // PLACEHOLDER ENDPOINT
        bookingData
      );

      // Parse response for confirmation ID
      // Format varies by endpoint - will be updated after discovery
      const confirmationId = response.data.confirmationId ||
                            response.data.confirmation_id ||
                            response.data.c ||
                            `CONF-${Date.now()}`;  // Fallback

      const actualCourt = response.data.actualCourt || response.data.actual_court || courtNumber;

      console.log(`[GameTime] Booking successful! Confirmation: ${confirmationId}`);

      return {
        confirmationId,
        actualCourt,
      };
    } catch (error) {
      console.error(
        '[GameTime] Booking submission error:',
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  /**
   * Check if service is authenticated
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Logout from GameTime
   */
  async logout(): Promise<void> {
    try {
      await this.client.post('/auth/logout');
      this.isAuthenticated = false;
      console.log('[GameTime] Logged out');
    } catch (error) {
      console.error('[GameTime] Logout error:', error);
      this.isAuthenticated = false;
    }
  }
}

/**
 * Singleton instance
 */
export const gametimeApi = new GameTimeApiService();
