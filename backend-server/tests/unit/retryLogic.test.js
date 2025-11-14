/**
 * Test Suite B: Retry Logic
 *
 * Tests the retry mechanism that handles different page types
 * Priority 1 tests: B1, B2
 * Priority 2 tests: B3, B4, B5
 *
 * Note: Since retry logic is embedded in executeBookingPrecisionTimed,
 * these tests simulate the logic flow using detectPageType results
 */

const { detectPageType } = require('../../playwrightBooking');
const { MockPage, PageStates } = require('../mocks/playwrightPageMock');

describe('Test Suite B: Retry Logic', () => {

  // Helper function to simulate retry logic behavior
  function simulateRetryBehavior(pageStates, MAX_RETRIES = 2) {
    const history = {
      gotoCount: 0,
      retryCount: 0,
      waitCalls: [],
      pageTypes: [],
      shouldBreak: false,
      shouldContinue: false
    };

    let retryCount = 0;

    for (let i = 0; i < pageStates.length && retryCount < MAX_RETRIES; i++) {
      const pageType = pageStates[i];
      history.pageTypes.push(pageType);
      history.gotoCount++;

      if (pageType === 'form_loaded') {
        // Success - would proceed with booking
        history.shouldBreak = false;
        return history;
      } else if (pageType === 'too_early') {
        // Retry immediately
        history.retryCount = ++retryCount;
        history.shouldContinue = true;
      } else if (pageType === 'court_held') {
        // Move to next court
        history.shouldBreak = true;
        return history;
      } else if (pageType === 'network_error') {
        // Move to next court
        history.shouldBreak = true;
        return history;
      } else if (pageType === 'loading_slow') {
        // Retry same court
        history.retryCount = ++retryCount;
        history.shouldContinue = true;
      } else {
        // unknown - retry
        history.retryCount = ++retryCount;
        history.shouldContinue = true;
      }

      // Check if max retries reached
      if (retryCount >= MAX_RETRIES) {
        history.maxRetriesReached = true;
        return history;
      }
    }

    return history;
  }

  // ========== Priority 1 Tests ==========

  describe('Priority 1: Critical retry behaviors', () => {

    test('B1: Too early triggers immediate retry', async () => {
      // Arrange - First call returns too_early, second returns form_loaded
      const pageStates = ['too_early', 'form_loaded'];

      // Act
      const history = simulateRetryBehavior(pageStates);

      // Assert
      expect(history.gotoCount).toBe(2); // Two goto calls
      expect(history.retryCount).toBe(1); // Retry count incremented
      expect(history.pageTypes).toEqual(['too_early', 'form_loaded']);
      expect(history.shouldBreak).toBe(false); // Should continue with form
      expect(history.maxRetriesReached).toBeUndefined(); // Did not hit max retries
    });

    test('B2: MAX_RETRIES = 2 is enforced', () => {
      // Arrange - All attempts return too_early
      const pageStates = ['too_early', 'too_early', 'too_early', 'too_early'];

      // Act
      const history = simulateRetryBehavior(pageStates, 2);

      // Assert
      expect(history.gotoCount).toBe(2); // Only 2 attempts (initial + 1 retry)
      expect(history.retryCount).toBe(2); // Retry count = 2
      expect(history.maxRetriesReached).toBe(true); // Max retries hit
      expect(history.pageTypes).toEqual(['too_early', 'too_early']); // Only first 2 processed
    });
  });

  // ========== Priority 2 Tests ==========

  describe('Priority 2: Different page type behaviors', () => {

    test('B3: Court held breaks to next court (no retry)', () => {
      // Arrange
      const pageStates = ['court_held'];

      // Act
      const history = simulateRetryBehavior(pageStates);

      // Assert
      expect(history.gotoCount).toBe(1); // Only one attempt
      expect(history.retryCount).toBe(0); // No retries
      expect(history.shouldBreak).toBe(true); // Should move to next court
      expect(history.pageTypes).toEqual(['court_held']);
    });

    test('B4: Network error breaks to next court (no retry)', () => {
      // Arrange
      const pageStates = ['network_error'];

      // Act
      const history = simulateRetryBehavior(pageStates);

      // Assert
      expect(history.gotoCount).toBe(1); // Only one attempt
      expect(history.retryCount).toBe(0); // No retries
      expect(history.shouldBreak).toBe(true); // Should move to next court
      expect(history.pageTypes).toEqual(['network_error']);
    });

    test('B5: Loading slow triggers retry', () => {
      // Arrange - First call returns loading_slow, second returns form_loaded
      const pageStates = ['loading_slow', 'form_loaded'];

      // Act
      const history = simulateRetryBehavior(pageStates);

      // Assert
      expect(history.gotoCount).toBe(2); // Two attempts
      expect(history.retryCount).toBe(1); // One retry
      expect(history.pageTypes).toEqual(['loading_slow', 'form_loaded']);
      expect(history.shouldBreak).toBe(false); // Continue with form
    });
  });

  // ========== Additional Retry Scenarios ==========

  describe('Additional retry scenarios', () => {

    test('Unknown error triggers retry up to MAX_RETRIES', () => {
      // Arrange
      const pageStates = ['unknown', 'unknown', 'unknown'];

      // Act
      const history = simulateRetryBehavior(pageStates, 2);

      // Assert
      expect(history.gotoCount).toBe(2); // 2 attempts (initial + 1 retry)
      expect(history.retryCount).toBe(2); // Two retries attempted
      expect(history.maxRetriesReached).toBe(true);
    });

    test('Success on second retry after too_early', () => {
      // Arrange
      const pageStates = ['too_early', 'too_early', 'form_loaded'];

      // Act
      const history = simulateRetryBehavior(pageStates, 3);

      // Assert
      expect(history.gotoCount).toBe(3); // Three attempts
      expect(history.retryCount).toBe(2); // Two retries
      expect(history.pageTypes).toEqual(['too_early', 'too_early', 'form_loaded']);
      expect(history.shouldBreak).toBe(false); // Success
    });

    test('Court held on first attempt stops immediately', () => {
      // Arrange
      const pageStates = ['court_held', 'form_loaded']; // Second state should not be reached

      // Act
      const history = simulateRetryBehavior(pageStates);

      // Assert
      expect(history.gotoCount).toBe(1); // Only first attempt
      expect(history.pageTypes).toEqual(['court_held']); // Second state not processed
      expect(history.shouldBreak).toBe(true);
    });

    test('Mixed retryable errors eventually reach max retries', () => {
      // Arrange - Mix of too_early and loading_slow
      const pageStates = ['too_early', 'loading_slow', 'unknown', 'too_early'];

      // Act
      const history = simulateRetryBehavior(pageStates, 2);

      // Assert
      expect(history.gotoCount).toBe(2); // Only 2 attempts
      expect(history.retryCount).toBe(2);
      expect(history.maxRetriesReached).toBe(true);
    });

    test('Form loaded on first attempt requires no retry', () => {
      // Arrange
      const pageStates = ['form_loaded'];

      // Act
      const history = simulateRetryBehavior(pageStates);

      // Assert
      expect(history.gotoCount).toBe(1);
      expect(history.retryCount).toBe(0);
      expect(history.shouldBreak).toBe(false);
      expect(history.pageTypes).toEqual(['form_loaded']);
    });
  });

  // ========== Integration with detectPageType ==========

  describe('Integration with actual detectPageType', () => {

    test('Sequence: too_early -> form_loaded works correctly', async () => {
      // Arrange
      const page1 = PageStates.tooEarly();
      const page2 = PageStates.formLoaded();

      // Act
      const result1 = await detectPageType(page1);
      const result2 = await detectPageType(page2);

      // Assert
      expect(result1).toBe('too_early');
      expect(result2).toBe('form_loaded');

      // Simulate retry logic
      const history = simulateRetryBehavior([result1, result2]);
      expect(history.retryCount).toBe(1);
      expect(history.gotoCount).toBe(2);
    });

    test('Sequence: court_held stops immediately', async () => {
      // Arrange
      const page = PageStates.courtHeld();

      // Act
      const result = await detectPageType(page);

      // Assert
      expect(result).toBe('court_held');

      const history = simulateRetryBehavior([result]);
      expect(history.shouldBreak).toBe(true);
      expect(history.retryCount).toBe(0);
    });

    test('Sequence: loading_slow -> form_loaded retries correctly', async () => {
      // Arrange
      const page1 = PageStates.loadingSlow();
      const page2 = PageStates.formLoaded();

      // Act
      const result1 = await detectPageType(page1);
      const result2 = await detectPageType(page2);

      // Assert
      expect(result1).toBe('loading_slow');
      expect(result2).toBe('form_loaded');

      const history = simulateRetryBehavior([result1, result2]);
      expect(history.retryCount).toBe(1);
      expect(history.shouldBreak).toBe(false);
    });
  });

  // ========== Retry Count Validation ==========

  describe('Retry count progression', () => {

    test('Retry count increments correctly for each retry', () => {
      const scenarios = [
        { states: ['too_early'], expectedRetry: 1 },
        { states: ['too_early', 'too_early'], expectedRetry: 2 },
        { states: ['loading_slow'], expectedRetry: 1 },
        { states: ['unknown'], expectedRetry: 1 },
      ];

      scenarios.forEach(({ states, expectedRetry }) => {
        const history = simulateRetryBehavior(states, 2);
        expect(history.retryCount).toBe(expectedRetry);
      });
    });

    test('Retry count does not increment for non-retryable errors', () => {
      const nonRetryableStates = ['court_held', 'network_error'];

      nonRetryableStates.forEach(state => {
        const history = simulateRetryBehavior([state]);
        expect(history.retryCount).toBe(0);
        expect(history.shouldBreak).toBe(true);
      });
    });

    test('Success does not increment retry count', () => {
      const history = simulateRetryBehavior(['form_loaded']);
      expect(history.retryCount).toBe(0);
      expect(history.shouldBreak).toBe(false);
    });
  });
});
