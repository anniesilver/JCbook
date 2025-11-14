/**
 * Test Suite A: detectPageType() Function
 *
 * Tests the fast page type detection using URL and text analysis
 * Priority 1 tests: A1, A2, A3
 * Priority 2 tests: A4, A5, A6
 */

const { detectPageType } = require('../../playwrightBooking');
const { MockPage, PageStates } = require('../mocks/playwrightPageMock');

describe('Test Suite A: detectPageType()', () => {

  // ========== Priority 1 Tests ==========

  describe('Priority 1: Critical page type detection', () => {

    test('A1: Should detect "too_early" page with countdown timer', async () => {
      // Arrange
      const mockPage = PageStates.tooEarly();

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('too_early');
    });

    test('A2: Should detect "court_held" when another user is booking', async () => {
      // Arrange
      const mockPage = PageStates.courtHeld();

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('court_held');
    });

    test('A3: Should detect "form_loaded" when temp field is present', async () => {
      // Arrange
      const mockPage = PageStates.formLoaded();

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('form_loaded');
    });
  });

  // ========== Priority 2 Tests ==========

  describe('Priority 2: Edge case page type detection', () => {

    test('A4: Should detect "loading_slow" when form loads but temp field not ready', async () => {
      // Arrange
      const mockPage = PageStates.loadingSlow();

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('loading_slow');
    });

    test('A5: Should detect "network_error" for generic error pages', async () => {
      // Arrange
      const mockPage = PageStates.networkError();

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('network_error');
    });

    test('A6: Should detect "unknown" for unrecognized error messages', async () => {
      // Arrange
      const mockPage = PageStates.unknownError();

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('unknown');
    });
  });

  // ========== Additional Edge Cases ==========

  describe('Additional edge cases', () => {

    test('Should handle /bookerror URL with too_early message variations', async () => {
      // Arrange - Different wording but same meaning
      const mockPage = new MockPage({
        url: 'https://jct.gametime.net/scheduling/index/bookerror',
        textContent: 'Booking Not Available\nPlease wait 10 minutes\nTime: 8:32:15'
      });

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('too_early');
    });

    test('Should handle /error URL without specific message', async () => {
      // Arrange
      const mockPage = new MockPage({
        url: 'https://jct.gametime.net/error',
        textContent: 'An error occurred'
      });

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('network_error');
    });

    test('Should detect form_loaded even if temp field takes time to appear', async () => {
      // Arrange - temp field present with short timeout
      const mockPage = new MockPage({
        url: 'https://jct.gametime.net/scheduling/index/book/sport/1/court/50/date/2025-11-15/time/540',
        selectorResults: {
          'input[name="temp"]': { value: 'test-temp-value' }
        }
      });

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('form_loaded');
    });

    test('Should return unknown if textContent throws error on bookerror page', async () => {
      // Arrange - Error page but can't read text
      const mockPage = new MockPage({
        url: 'https://jct.gametime.net/scheduling/index/bookerror',
        textContentError: 'Cannot read text'
      });

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('unknown');
    });

    test('Should handle court_held with slight message variations', async () => {
      // Arrange
      const mockPage = new MockPage({
        url: 'https://jct.gametime.net/bookerror',
        textContent: 'Booking Not Available\nAnother member is currently booking this court'
      });

      // Act
      const result = await detectPageType(mockPage);

      // Assert
      expect(result).toBe('court_held');
    });
  });

  // ========== Performance Tests ==========

  describe('Performance requirements', () => {

    test('Detection should complete in under 100ms for too_early', async () => {
      // Arrange
      const mockPage = PageStates.tooEarly();
      const startTime = Date.now();

      // Act
      await detectPageType(mockPage);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100);
    });

    test('Detection should complete in under 100ms for court_held', async () => {
      // Arrange
      const mockPage = PageStates.courtHeld();
      const startTime = Date.now();

      // Act
      await detectPageType(mockPage);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100);
    });

    test('Detection should complete quickly for form_loaded', async () => {
      // Arrange
      const mockPage = PageStates.formLoaded();
      const startTime = Date.now();

      // Act
      await detectPageType(mockPage);
      const duration = Date.now() - startTime;

      // Assert
      expect(duration).toBeLessThan(100);
    });
  });

  // ========== URL Pattern Tests ==========

  describe('URL pattern matching', () => {

    test('Should recognize bookerror in different URL paths', async () => {
      const urls = [
        'https://jct.gametime.net/scheduling/index/bookerror',
        'https://jct.gametime.net/scheduling/index/bookerror/sport/1/court/50',
        'https://jct.gametime.net/bookerror/sport/1',
      ];

      for (const url of urls) {
        const mockPage = new MockPage({
          url,
          textContent: 'Booking Not Available\nPlease wait 5 minutes\nTime: 4:32'
        });

        const result = await detectPageType(mockPage);
        expect(result).toBe('too_early');
      }
    });

    test('Should recognize /error in different URL paths', async () => {
      const urls = [
        'https://jct.gametime.net/error',
        'https://jct.gametime.net/scheduling/index/error',
        'https://jct.gametime.net/scheduling/error/500',
      ];

      for (const url of urls) {
        const mockPage = new MockPage({
          url,
          textContent: 'Server error'
        });

        const result = await detectPageType(mockPage);
        expect(result).toBe('network_error');
      }
    });

    test('Should recognize booking form URLs', async () => {
      const urls = [
        'https://jct.gametime.net/scheduling/index/book/sport/1/court/50/date/2025-11-15/time/540',
        'https://jct.gametime.net/scheduling/index/book/sport/1/court/51/date/2025-11-16/time/600',
      ];

      for (const url of urls) {
        const mockPage = new MockPage({
          url,
          selectorResults: {
            'input[name="temp"]': { value: 'temp123' }
          }
        });

        const result = await detectPageType(mockPage);
        expect(result).toBe('form_loaded');
      }
    });
  });
});
