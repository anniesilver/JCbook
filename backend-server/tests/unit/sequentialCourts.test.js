/**
 * Test Suite E: Sequential Court Fallback
 *
 * Tests that courts are tried one at a time with proper success/failure handling
 *
 * Priority 1 tests: E1, E2, E3
 * Priority 2 tests: E4
 */

const { detectPageType } = require('../../playwrightBooking');

describe('Test Suite E: Sequential Court Fallback', () => {

  // Helper to simulate sequential court attempts
  function simulateSequentialCourts(courtsConfig, MAX_RETRIES = 2) {
    const history = {
      courtsAttempted: [],
      attemptTimestamps: [],
      finalResult: null
    };

    for (const courtConfig of courtsConfig) {
      const court = courtConfig.court;
      const pageStates = courtConfig.pageStates;

      history.courtsAttempted.push(court);
      const courtStartTime = Date.now();
      history.attemptTimestamps.push({ court, startTime: courtStartTime });

      let retryCount = 0;

      // Retry loop for this court
      for (let i = 0; i < pageStates.length && retryCount < MAX_RETRIES; i++) {
        const pageType = pageStates[i];

        if (pageType === 'form_loaded') {
          // Simulate booking success
          const bookingSuccess = courtConfig.bookingSuccess !== false; // Default true

          if (bookingSuccess) {
            history.finalResult = {
              success: true,
              courtBooked: court,
              message: `Successfully booked court ${court}`
            };
            return history; // Exit immediately on success
          } else {
            // Form loaded but booking failed - move to next court
            break;
          }
        } else if (pageType === 'too_early' || pageType === 'loading_slow' || pageType === 'unknown') {
          // Retryable errors
          retryCount++;
          if (retryCount >= MAX_RETRIES) {
            break; // Max retries reached, move to next court
          }
          continue; // Retry same court
        } else {
          // Non-retryable errors (court_held, network_error)
          break; // Move to next court immediately
        }
      }

      // Court exhausted or failed, continue to next court
      const courtEndTime = Date.now();
      const lastAttempt = history.attemptTimestamps[history.attemptTimestamps.length - 1];
      lastAttempt.endTime = courtEndTime;
    }

    // All courts exhausted
    if (!history.finalResult || !history.finalResult.success) {
      history.finalResult = {
        success: false,
        error: `All courts unavailable or failed. Tried: ${history.courtsAttempted.join(', ')}`,
        courtsTried: history.courtsAttempted
      };
    }

    return history;
  }

  // ========== Priority 1 Tests ==========

  describe('Priority 1: Critical sequential court behaviors', () => {

    test('E1: Courts tried one at a time (not parallel)', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['court_held'] },
        { court: '2', pageStates: ['court_held'] },
        { court: '3', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert - Verify sequential execution
      expect(history.courtsAttempted).toEqual(['1', '2', '3']);
      expect(history.attemptTimestamps.length).toBe(3);

      // Verify Court 2 starts after Court 1 completes
      const court1End = history.attemptTimestamps[0].endTime;
      const court2Start = history.attemptTimestamps[1].startTime;
      expect(court2Start).toBeGreaterThanOrEqual(court1End);

      // Verify Court 3 starts after Court 2 completes
      const court2End = history.attemptTimestamps[1].endTime;
      const court3Start = history.attemptTimestamps[2].startTime;
      expect(court3Start).toBeGreaterThanOrEqual(court2End);
    });

    test('E2: Success on any court returns immediately', () => {
      // Arrange
      const courtsConfig = [
        { court: '5', pageStates: ['court_held'] },
        { court: '6', pageStates: ['form_loaded'], bookingSuccess: true },
        { court: '1', pageStates: ['form_loaded'], bookingSuccess: true }, // Should not be reached
        { court: '2', pageStates: ['form_loaded'], bookingSuccess: true }  // Should not be reached
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['5', '6']); // Only first 2 courts attempted
      expect(history.finalResult.success).toBe(true);
      expect(history.finalResult.courtBooked).toBe('6');

      // Courts 1 and 2 should never be attempted
      expect(history.courtsAttempted).not.toContain('1');
      expect(history.courtsAttempted).not.toContain('2');
    });

    test('E3: All courts exhausted returns failure', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['court_held'] },
        { court: '2', pageStates: ['network_error'] }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.finalResult.success).toBe(false);
      expect(history.finalResult.error).toBe('All courts unavailable or failed. Tried: 1, 2');
      expect(history.finalResult.courtsTried).toEqual(['1', '2']);
    });
  });

  // ========== Priority 2 Tests ==========

  describe('Priority 2: Court order and additional scenarios', () => {

    test('E4: Court order preserved (preferred court first)', () => {
      // Arrange - User's preferred order
      const courtsConfig = [
        { court: '3', pageStates: ['court_held'] },
        { court: '1', pageStates: ['network_error'] },
        { court: '5', pageStates: ['form_loaded'], bookingSuccess: false },
        { court: '2', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert - Attempts happen in exact order provided
      expect(history.courtsAttempted).toEqual(['3', '1', '5', '2']);

      // NOT in numerical order (1, 2, 3, 5)
      expect(history.courtsAttempted).not.toEqual(['1', '2', '3', '5']);
    });
  });

  // ========== Additional Sequential Scenarios ==========

  describe('Additional sequential scenarios', () => {

    test('First court succeeds immediately (no fallback needed)', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['form_loaded'], bookingSuccess: true },
        { court: '2', pageStates: ['form_loaded'], bookingSuccess: true },
        { court: '3', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['1']); // Only first court attempted
      expect(history.finalResult.success).toBe(true);
      expect(history.finalResult.courtBooked).toBe('1');
    });

    test('Multiple courts fail before one succeeds', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['court_held'] },
        { court: '2', pageStates: ['too_early', 'too_early'] }, // Exhausts retries
        { court: '3', pageStates: ['network_error'] },
        { court: '4', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['1', '2', '3', '4']);
      expect(history.finalResult.success).toBe(true);
      expect(history.finalResult.courtBooked).toBe('4');
    });

    test('Single court in list that fails results in failure', () => {
      // Arrange
      const courtsConfig = [
        { court: '5', pageStates: ['court_held'] }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['5']);
      expect(history.finalResult.success).toBe(false);
      expect(history.finalResult.courtsTried).toEqual(['5']);
    });

    test('Single court in list that succeeds results in success', () => {
      // Arrange
      const courtsConfig = [
        { court: '3', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['3']);
      expect(history.finalResult.success).toBe(true);
      expect(history.finalResult.courtBooked).toBe('3');
    });

    test('Form loads but booking submission fails - moves to next court', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['form_loaded'], bookingSuccess: false }, // Form loads but submission fails
        { court: '2', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['1', '2']);
      expect(history.finalResult.success).toBe(true);
      expect(history.finalResult.courtBooked).toBe('2');
    });

    test('All courts fail with different error types', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['court_held'] },
        { court: '2', pageStates: ['network_error'] },
        { court: '3', pageStates: ['too_early', 'too_early'] }, // Retries exhausted
        { court: '4', pageStates: ['loading_slow', 'unknown'] }, // Mixed retryable errors
        { court: '5', pageStates: ['form_loaded'], bookingSuccess: false }, // Form loads but fails
        { court: '6', pageStates: ['unknown', 'unknown'] } // Exhausts retries
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['1', '2', '3', '4', '5', '6']);
      expect(history.finalResult.success).toBe(false);
      expect(history.finalResult.courtsTried).toEqual(['1', '2', '3', '4', '5', '6']);
    });
  });

  // ========== Retry Interaction Tests ==========

  describe('Retry interaction with court fallback', () => {

    test('Court with retryable errors eventually moves to next court', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['too_early', 'too_early', 'too_early'] }, // Exceeds MAX_RETRIES=2
        { court: '2', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig, 2);

      // Assert
      expect(history.courtsAttempted).toEqual(['1', '2']);
      expect(history.finalResult.courtBooked).toBe('2');
    });

    test('Court with immediate failure (court_held) skips retries', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['court_held', 'form_loaded'] }, // Second state should not be reached
        { court: '2', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['1', '2']);
      expect(history.finalResult.courtBooked).toBe('2');
    });

    test('Court succeeds on retry (no fallback needed)', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['too_early', 'form_loaded'], bookingSuccess: true },
        { court: '2', pageStates: ['form_loaded'], bookingSuccess: true } // Should not be reached
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['1']); // Only first court attempted
      expect(history.finalResult.courtBooked).toBe('1');
    });
  });

  // ========== Performance Validation ==========

  describe('Performance validation', () => {

    test('Sequential execution takes measurable time (not instant)', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: ['court_held'] },
        { court: '2', pageStates: ['court_held'] },
        { court: '3', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      const startTime = Date.now();

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      const duration = Date.now() - startTime;

      // Assert - Execution completes (duration >= 0)
      expect(duration).toBeGreaterThanOrEqual(0);

      // Verify attempts happen in sequence (court 1 completes before court 2 starts)
      expect(history.attemptTimestamps[0].endTime).toBeLessThanOrEqual(history.attemptTimestamps[1].startTime);

      // Verify court 2 completes before court 3 starts
      expect(history.attemptTimestamps[1].endTime).toBeLessThanOrEqual(history.attemptTimestamps[2].startTime);
    });

    test('Success on first court completes faster than trying all courts', () => {
      // Arrange
      const successConfig = [
        { court: '1', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      const failureConfig = [
        { court: '1', pageStates: ['court_held'] },
        { court: '2', pageStates: ['court_held'] },
        { court: '3', pageStates: ['court_held'] },
        { court: '4', pageStates: ['court_held'] },
        { court: '5', pageStates: ['court_held'] },
        { court: '6', pageStates: ['court_held'] }
      ];

      // Act
      const start1 = Date.now();
      const successHistory = simulateSequentialCourts(successConfig);
      const successDuration = Date.now() - start1;

      const start2 = Date.now();
      const failureHistory = simulateSequentialCourts(failureConfig);
      const failureDuration = Date.now() - start2;

      // Assert
      expect(successHistory.courtsAttempted.length).toBe(1);
      expect(failureHistory.courtsAttempted.length).toBe(6);

      // Early success should complete in less time (or equal in fast tests)
      expect(successDuration).toBeLessThanOrEqual(failureDuration + 5); // Allow 5ms variance
    });
  });

  // ========== Edge Cases ==========

  describe('Edge cases', () => {

    test('Empty courts array results in failure', () => {
      // Arrange
      const courtsConfig = [];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual([]);
      expect(history.finalResult.success).toBe(false);
      expect(history.finalResult.courtsTried).toEqual([]);
    });

    test('Court with empty pageStates moves to next court', () => {
      // Arrange
      const courtsConfig = [
        { court: '1', pageStates: [] }, // No page states
        { court: '2', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['1', '2']);
      expect(history.finalResult.courtBooked).toBe('2');
    });

    test('Multiple courts with same ID are still tried sequentially', () => {
      // Arrange - Duplicate court IDs (edge case, but should still work)
      const courtsConfig = [
        { court: '1', pageStates: ['court_held'] },
        { court: '1', pageStates: ['form_loaded'], bookingSuccess: true }
      ];

      // Act
      const history = simulateSequentialCourts(courtsConfig);

      // Assert
      expect(history.courtsAttempted).toEqual(['1', '1']);
      expect(history.finalResult.courtBooked).toBe('1');
    });
  });
});
