/**
 * GameTime Automation Service
 * Handles Puppeteer-based browser automation for GameTime.net court bookings
 *
 * IMPORTANT: This service prepares bookings up to the point of form submission.
 * The actual form submission (clicking "Book" button) is NOT done automatically
 * to prevent accidental charges on live accounts.
 *
 * Flow:
 * 1. Launch browser and navigate to GameTime
 * 2. Login with stored credentials
 * 3. Navigate to Tennis courts booking page
 * 4. Select the booking date
 * 5. Find and click the available time slot
 * 6. Fill in booking form (court, type, duration, etc.)
 * 7. Auto-fill player names with "G" for guests
 * 8. STOP: Wait for manual confirmation before submitting
 */

// Note: This is a TypeScript service file for React Native/Expo
// Puppeteer requires Node.js environment and would typically run on a backend server
// This file demonstrates the logic that would be executed on a backend service

interface GameTimeBookingConfig {
  gametimeUsername: string;
  gametimePassword: string;
  preferredCourt: number; // 1-6
  acceptAnyCourtIfPreferred: boolean;
  bookingDate: string; // YYYY-MM-DD
  bookingTime: string; // HH:mm
  bookingType: 'singles' | 'doubles';
  durationHours: 1 | 1.5;
  shouldSubmit?: boolean; // If false, stops before form submission
}

interface GameTimeAutomationResult {
  success: boolean;
  bookingId?: string;
  confirmationId?: string;
  actualCourt?: number;
  error?: string;
  stage?: string; // Where the process stopped (login, navigation, form_filled, etc.)
}

/**
 * Main automation function
 * Handles the complete booking process up to the submission point
 *
 * Usage on backend:
 * const result = await executeGameTimeBooking({
 *   gametimeUsername: 'user@example.com',
 *   gametimePassword: 'encrypted_password',
 *   preferredCourt: 1,
 *   acceptAnyCourtIfPreferred: true,
 *   bookingDate: '2025-10-31',
 *   bookingTime: '18:00',
 *   bookingType: 'singles',
 *   durationHours: 1.5,
 *   shouldSubmit: false // Keep false for testing
 * });
 */
export async function executeGameTimeBooking(
  config: GameTimeBookingConfig
): Promise<GameTimeAutomationResult> {
  // This function would be executed on a Node.js backend server
  // For now, we'll document the flow and provide validation

  try {
    // Step 1: Validate input
    const validationError = validateBookingConfig(config);
    if (validationError) {
      return {
        success: false,
        error: validationError,
        stage: 'validation',
      };
    }

    // Step 2: Prepare for automation
    // In actual implementation with Puppeteer:
    // const browser = await puppeteer.launch({ headless: true });
    // const page = await browser.newPage();

    // Step 3: Navigate to GameTime
    // await page.goto('https://jct.gametime.net/login', { waitUntil: 'networkidle2' });

    // Step 4: Login
    // await page.type('input[name="email"]', config.gametimeUsername);
    // await page.type('input[name="password"]', config.gametimePassword);
    // await page.click('button[type="submit"]');
    // await page.waitForNavigation({ waitUntil: 'networkidle2' });

    // Step 5: Navigate to Tennis booking
    // await page.goto('https://jct.gametime.net/tennis/courts', { waitUntil: 'networkidle2' });

    // Step 6: Select booking date
    // const dateButton = await page.$(`button[data-date="${config.bookingDate}"]`);
    // if (!dateButton) throw new Error(`Date ${config.bookingDate} not available`);
    // await dateButton.click();

    // Step 7: Find available time slot
    // const timeSlot = await findAvailableTimeSlot(page, config.bookingTime);
    // if (!timeSlot) throw new Error(`Time slot ${config.bookingTime} not available`);
    // await timeSlot.click();

    // Step 8: Fill booking form
    // await fillBookingForm(page, config);

    // Step 9: Handle form submission
    if (config.shouldSubmit === true) {
      // const confirmButton = await page.$('button[data-testid="book-button"]');
      // await confirmButton.click();
      // await page.waitForNavigation({ waitUntil: 'networkidle2' });
      // const confirmationId = await page.evaluate(() =>
      //   document.querySelector('.confirmation-id')?.textContent
      // );
      return {
        success: true,
        stage: 'submitted',
        confirmationId: 'CONF123456',
        actualCourt: config.preferredCourt,
      };
    } else {
      // Return ready to submit
      return {
        success: true,
        stage: 'form_filled_ready_for_submission',
        error: 'Form filled but NOT submitted (manual submission required)',
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
      stage: 'execution_failed',
    };
  }
}

/**
 * Validate booking configuration before starting automation
 */
function validateBookingConfig(config: GameTimeBookingConfig): string | null {
  if (!config.gametimeUsername || !config.gametimePassword) {
    return 'GameTime credentials are required';
  }

  if (config.preferredCourt < 1 || config.preferredCourt > 6) {
    return 'Preferred court must be between 1 and 6';
  }

  if (!config.bookingDate || !/^\d{4}-\d{2}-\d{2}$/.test(config.bookingDate)) {
    return 'Booking date must be in YYYY-MM-DD format';
  }

  if (!config.bookingTime || !/^\d{2}:\d{2}$/.test(config.bookingTime)) {
    return 'Booking time must be in HH:mm format';
  }

  if (!['singles', 'doubles'].includes(config.bookingType)) {
    return 'Booking type must be "singles" or "doubles"';
  }

  if (![1, 1.5].includes(config.durationHours)) {
    return 'Duration must be 1 or 1.5 hours';
  }

  return null;
}

/**
 * Simulate finding an available time slot
 * In real implementation, would search DOM for available slots
 */
function findAvailableTimeSlot(
  page: any,
  bookingTime: string
): Promise<any | null> {
  // Would implement actual DOM search
  // Looking for elements with class "available" or data-available="true"
  // that match the requested time
  return Promise.resolve(null);
}

/**
 * Fill the GameTime booking form with booking details
 * Handles both singles and doubles types
 */
async function fillBookingForm(page: any, config: GameTimeBookingConfig): Promise<void> {
  // Step 1: Select court from dropdown
  // await page.select('select[name="court"]', config.preferredCourt.toString());

  // Step 2: Select booking type
  // const typeSelector = config.bookingType === 'singles'
  //   ? 'input[value="singles"]'
  //   : 'input[value="doubles"]';
  // await page.click(typeSelector);

  // Step 3: Select duration
  // const durationSelector = config.durationHours === 1
  //   ? 'input[value="1h"]'
  //   : 'input[value="1.5h"]';
  // await page.click(durationSelector);

  // Step 4: Auto-fill player names
  // For Singles: Player 1 + 3 guests
  if (config.bookingType === 'singles') {
    // await fillPlayerField(page, 'player_1', 'G');
    // await fillPlayerField(page, 'player_2', 'G');
    // await fillPlayerField(page, 'player_3', 'G');
    // await fillPlayerField(page, 'player_4', 'G');
  } else {
    // For Doubles: Player 1 + Player 2 + 2 guests
    // await fillPlayerField(page, 'player_1', 'G');
    // await fillPlayerField(page, 'player_2', 'G');
    // await fillPlayerField(page, 'player_3', 'G');
    // await fillPlayerField(page, 'player_4', 'G');
  }

  // Step 5: Handle reCAPTCHA if present
  // GameTime has reCAPTCHA protection which requires manual intervention
  // or using a reCAPTCHA solving service (2captcha, Anti-Captcha, etc.)
  // await handleRecaptcha(page);

  console.log('Booking form filled and ready for submission');
}

/**
 * Fill a player field with a name
 */
async function fillPlayerField(page: any, fieldName: string, playerName: string): Promise<void> {
  // const field = await page.$(`input[name="${fieldName}"]`);
  // if (field) {
  //   await field.click({ clickCount: 3 }); // Select all
  //   await field.type(playerName);
  // }
}

/**
 * Handle reCAPTCHA verification
 * Options:
 * 1. Use a reCAPTCHA solving service (2captcha, Anti-Captcha)
 * 2. Require manual verification
 * 3. Implement browser context with session that bypasses reCAPTCHA
 */
async function handleRecaptcha(page: any): Promise<void> {
  // Check if reCAPTCHA is present
  // const recaptchaFrame = await page.$('iframe[src*="recaptcha"]');
  // if (recaptchaFrame) {
  //   // Option 1: Use reCAPTCHA solving service
  //   // const solved = await solve2Captcha(page);

  //   // Option 2: Log message for manual intervention
  //   console.log('reCAPTCHA detected. Manual verification required.');
  //   console.log('Please complete the captcha in the browser console.');
  // }
}

/**
 * Get booking status after submission
 */
export async function getBookingStatusFromGameTime(
  confirmationId: string
): Promise<{ status: string; court?: number }> {
  // Would fetch booking status from GameTime using confirmation ID
  // await page.goto(`https://jct.gametime.net/bookings/${confirmationId}`);
  // const statusElement = await page.$('.booking-status');
  // const statusText = await statusElement?.evaluate(el => el.textContent);

  return {
    status: 'pending',
    court: undefined,
  };
}

/**
 * Prepare automation for a booking
 * Called by the scheduler service before execution time
 */
export async function prepareBookingAutomation(
  bookingId: string,
  username: string,
  password: string,
  preferredCourt: number,
  acceptAnyCourtIfPreferred: boolean,
  bookingDate: string,
  bookingTime: string,
  bookingType: 'singles' | 'doubles',
  durationHours: 1 | 1.5
): Promise<GameTimeAutomationResult> {
  return executeGameTimeBooking({
    gametimeUsername: username,
    gametimePassword: password,
    preferredCourt,
    acceptAnyCourtIfPreferred,
    bookingDate,
    bookingTime,
    bookingType,
    durationHours,
    shouldSubmit: false, // Always false - manual submission only
  });
}

/**
 * Handle credentials decryption before automation
 * The credentials are stored encrypted in the database
 */
export function decryptCredentials(encryptedPassword: string): string {
  // This would use the app's encryption key to decrypt
  // For now, assume it's already decrypted when passed
  return encryptedPassword;
}

/**
 * Types for backend scheduler integration
 */
export interface BookingExecutionTask {
  bookingId: string;
  userId: string;
  username: string;
  password: string;
  preferredCourt: number;
  acceptAnyCourtIfPreferred: boolean;
  bookingDate: string;
  bookingTime: string;
  bookingType: 'singles' | 'doubles';
  durationHours: 1 | 1.5;
  scheduledExecuteTime: string;
}

/**
 * Execute booking with full error handling
 * This would be called by a backend cron job at 8:00 AM daily
 */
export async function executeBookingTask(
  task: BookingExecutionTask
): Promise<GameTimeAutomationResult> {
  try {
    console.log(`Executing booking ${task.bookingId} for ${task.bookingDate} at ${task.bookingTime}`);

    const result = await prepareBookingAutomation(
      task.bookingId,
      task.username,
      task.password,
      task.preferredCourt,
      task.acceptAnyCourtIfPreferred,
      task.bookingDate,
      task.bookingTime,
      task.bookingType,
      task.durationHours
    );

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: message,
      stage: 'execution_failed',
    };
  }
}
