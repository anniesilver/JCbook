/**
 * GameTime API Service
 * Handles integration with GameTime.net tennis court booking system
 *
 * Manages direct API communication with proper session cookie handling
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
 * Handles all communication with GameTime.net API
 *
 * Session Management:
 * - Extracts session cookie from login response
 * - Automatically attaches cookie to all subsequent requests via interceptor
 * - Clears cookie on logout
 */
export class GameTimeApiService {
  private gametimeUrl: string = 'https://jct.gametime.net';
  private client: AxiosInstance;
  private isAuthenticated: boolean = false;
  private sessionCookie: string = '';

  constructor() {
    this.client = axios.create({
      baseURL: this.gametimeUrl,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      withCredentials: true,
    });

    // Add request interceptor to attach session cookie to all requests
    this.client.interceptors.request.use((config) => {
      if (this.sessionCookie) {
        config.headers.Cookie = this.sessionCookie;
      }
      return config;
    });
  }

  /**
   * Convert minutes to HH:MM format
   * Minutes are total minutes from midnight (0:00)
   * 0 = 00:00 (midnight)
   * 360 = 06:00 AM
   * 600 = 10:00 AM
   * 1020 = 5:00 PM
   * Values can exceed 1440 (midnight) for courts open past midnight
   */
  private minutesToTime(minutes: number): string {
    // Handle wrap-around for times past midnight (past 1440 minutes = 24 hours)
    const adjustedMinutes = minutes % 1440;

    const hours = Math.floor(adjustedMinutes / 60);
    const mins = adjustedMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  /**
   * Login to GameTime with credentials
   * @param username GameTime username/email
   * @param password GameTime password
   * @returns true if successful
   */
  async login(username: string, password: string, userId?: string): Promise<boolean> {
    try {
      console.log('[GameTime] Attempting login with username:', username);

      const response = await this.client.post('/auth',
        `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      // Extract session cookie from Set-Cookie header
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        const setCookieArray = Array.isArray(setCookieHeader)
          ? setCookieHeader
          : [setCookieHeader];

        // Parse cookies and find the gametime session cookie
        setCookieArray.forEach((cookie) => {
          const cookiePart = cookie.split(';')[0];
          const [cookieName, cookieValue] = cookiePart.split('=');

          if (cookieName && cookieValue) {
            const trimmedName = cookieName.trim();
            const trimmedValue = cookieValue.trim();

            // Store gametime session cookie
            if (trimmedName.toLowerCase() === 'gametime') {
              this.sessionCookie = `${trimmedName}=${trimmedValue}`;
              console.log('[GameTime] Session cookie stored:', this.sessionCookie);
            }
          }
        });
      }

      this.isAuthenticated = true;
      console.log('[GameTime] Login successful');
      return true;
    } catch (error) {
      console.error('[GameTime] Login error:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  /**
   * Fetch court availability for a specific date
   * @param date Date in YYYY-MM-DD format
   * @param userId User ID for per-user session management
   * @returns Court data with bookings and available slots
   */
  async getCourtAvailability(date: string, userId?: string): Promise<GameTimeCourtData | null> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      console.log('[GameTime] Fetching court availability for date:', date);

      const response = await this.client.get<GameTimeCourtData>(
        `/scheduling/index/jsoncourtdata/sport/1/date/${date}`,
        {
          headers: {
            'Referer': 'https://jct.gametime.net/scheduling/index/index/sport/1',
            'Accept': 'application/json, text/plain, */*',
          },
        }
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
            const slot = {
              courtNumber,
              courtName,
              startTime: this.minutesToTime(minutes),
              endTime: this.minutesToTime(slotEndTime),
              durationMinutes: interval,
              available: true,
            };
            slots.push(slot);
            console.log(`[GameTime] Available slot: Court ${courtNumber}, ${slot.startTime}-${slot.endTime}, ${interval} min`);
          }
        }
      }
    });

    console.log(`[GameTime] Found ${slots.length} available slots for ${date}`);
    console.log('[GameTime] Available slots:', slots);
    return slots;
  }

  /**
   * Submit a booking to GameTime
   *
   * @param courtNumber Court number (1-6)
   * @param date Date in YYYY-MM-DD format
   * @param startTime Start time in HH:MM format (24-hour)
   * @param durationMinutes Duration in minutes
   * @param numberOfPlayers Number of players
   * @param userId User ID for per-user session management
   * @returns Confirmation ID if successful, null if failed
   */
  async submitBooking(
    courtNumber: number,
    date: string,
    startTime: string,
    durationMinutes: number,
    numberOfPlayers: number = 2,
    userId?: string
  ): Promise<{ confirmationId: string; actualCourt: number } | null> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated. Please login first.');
      }

      console.log(
        `[GameTime] Submitting booking: Court ${courtNumber}, ${date} at ${startTime}, ${durationMinutes} min, ${numberOfPlayers} players`
      );

      // Convert start time to minutes from 6 AM
      const [hours, minutes] = startTime.split(':').map(Number);
      const startMinutes = (hours - 6) * 60 + minutes;

      const bookingData = {
        court: courtNumber,
        date,
        time: startMinutes,
        duration: durationMinutes,
        players: numberOfPlayers,
      };

      const response = await this.client.post('/scheduling/index/submitbooking', bookingData);

      const confirmationId = response.data.confirmationId || `CONF-${Date.now()}`;
      const actualCourt = response.data.actualCourt || courtNumber;

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
   * @param userId User ID for per-user session management
   */
  async logout(userId?: string): Promise<void> {
    try {
      await this.client.post('/auth/logout', {});
      this.isAuthenticated = false;
      this.sessionCookie = '';
      console.log('[GameTime] Logged out');
    } catch (error) {
      console.error('[GameTime] Logout error:', error);
      this.isAuthenticated = false;
      this.sessionCookie = '';
    }
  }
}

/**
 * Singleton instance
 */
export const gametimeApi = new GameTimeApiService();
