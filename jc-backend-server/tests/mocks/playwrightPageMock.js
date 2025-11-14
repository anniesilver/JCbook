/**
 * Mock Playwright Page object for testing
 * Simulates different page states and behaviors without launching a real browser
 */

class MockPage {
  constructor(config = {}) {
    this._url = config.url || '';
    this._textContent = config.textContent || '';
    this._selectorResults = config.selectorResults || {};
    this._gotoHistory = [];
    this._clickHistory = [];
    this._selectHistory = [];
    this._evaluateHistory = [];
    this._waitForSelectorCalls = [];
    this._config = config;
  }

  /**
   * Returns the current page URL
   */
  url() {
    return this._url;
  }

  /**
   * Simulates page navigation
   * @param {string} url - URL to navigate to
   * @param {Object} options - Navigation options
   */
  async goto(url, options = {}) {
    this._url = url;
    this._gotoHistory.push({
      url,
      timestamp: Date.now(),
      options
    });

    // Simulate navigation delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // If config has a callback for goto, execute it to allow changing page state
    if (this._config.onGoto) {
      this._config.onGoto(url, this);
    }

    return { status: 200 };
  }

  /**
   * Returns text content of a selector
   * @param {string} selector - CSS selector
   * @param {Object} options - Options
   */
  async textContent(selector, options = {}) {
    const timeout = options.timeout || 30000;

    // Simulate timeout for missing content
    if (!this._textContent && !this._config.textContentError) {
      throw new Error(`Timeout ${timeout}ms exceeded`);
    }

    if (this._config.textContentError) {
      throw new Error(this._config.textContentError);
    }

    return this._textContent;
  }

  /**
   * Waits for a selector to be present
   * @param {string} selector - CSS selector
   * @param {Object} options - Wait options
   */
  async waitForSelector(selector, options = {}) {
    const timeout = options.timeout || 30000;

    this._waitForSelectorCalls.push({ selector, options, timestamp: Date.now() });

    // Check if selector exists in config
    if (this._selectorResults[selector]) {
      return this._selectorResults[selector];
    }

    // Selector not found - throw timeout error
    throw new Error(`Timeout ${timeout}ms exceeded waiting for selector "${selector}"`);
  }

  /**
   * Clicks an element
   * @param {string} selector - CSS selector
   * @param {Object} options - Click options
   */
  async click(selector, options = {}) {
    this._clickHistory.push({ selector, options, timestamp: Date.now() });

    // Check if element exists
    if (!this._selectorResults[selector] && !this._config.allowAllClicks) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Simulate click delay
    await new Promise(resolve => setTimeout(resolve, 5));

    if (this._config.onClic && this._config.onClick[selector]) {
      this._config.onClick[selector](this);
    }
  }

  /**
   * Selects an option from a dropdown
   * @param {string} selector - CSS selector
   * @param {string|Object} values - Value(s) to select
   */
  async selectOption(selector, values, options = {}) {
    this._selectHistory.push({
      selector,
      values,
      options,
      timestamp: Date.now()
    });

    // Check if element exists
    if (!this._selectorResults[selector] && !this._config.allowAllSelects) {
      throw new Error(`Element not found: ${selector}`);
    }

    // Simulate select delay
    await new Promise(resolve => setTimeout(resolve, 5));

    return [values];
  }

  /**
   * Evaluates a selector and executes a function on it
   * @param {string} selector - CSS selector
   * @param {Function} fn - Function to execute
   * @param {*} args - Arguments to pass to function
   */
  async $eval(selector, fn, ...args) {
    // Check if element exists
    if (!this._selectorResults[selector]) {
      throw new Error(`Element not found: ${selector}`);
    }

    const element = this._selectorResults[selector];

    // If fn is a function that gets value, return it
    if (fn.toString().includes('value')) {
      return element.value || '';
    }

    // Otherwise execute the function
    return fn(element, ...args);
  }

  /**
   * Evaluates code in page context
   * @param {Function|string} fn - Function or code to evaluate
   * @param {*} args - Arguments
   */
  async evaluate(fn, ...args) {
    this._evaluateHistory.push({
      fn: fn.toString(),
      args,
      timestamp: Date.now()
    });

    // If config provides evaluate result, return it
    if (this._config.evaluateResult !== undefined) {
      return this._config.evaluateResult;
    }

    // Default behavior
    if (typeof fn === 'function') {
      return fn(...args);
    }

    return null;
  }

  /**
   * Waits for a function to return truthy value
   * @param {Function|string} fn - Function to evaluate
   * @param {Object} options - Wait options
   */
  async waitForFunction(fn, options = {}) {
    const timeout = options.timeout || 30000;

    // If config provides waitForFunction result, return it
    if (this._config.waitForFunctionResult !== undefined) {
      if (this._config.waitForFunctionResult === 'timeout') {
        throw new Error(`Timeout ${timeout}ms exceeded`);
      }
      return this._config.waitForFunctionResult;
    }

    // Default: assume function is truthy
    return true;
  }

  /**
   * Waits for specified time
   * @param {number} ms - Milliseconds to wait
   */
  async waitForTimeout(ms) {
    await new Promise(resolve => setTimeout(resolve, Math.min(ms, 10))); // Cap at 10ms for tests
  }

  /**
   * Gets browser context
   */
  context() {
    return {
      browser: () => ({
        close: async () => {
          this._browserClosed = true;
        }
      }),
      cookies: async () => this._config.cookies || []
    };
  }

  /**
   * Test helper: Get navigation history
   */
  getGotoHistory() {
    return this._gotoHistory;
  }

  /**
   * Test helper: Get click history
   */
  getClickHistory() {
    return this._clickHistory;
  }

  /**
   * Test helper: Get select history
   */
  getSelectHistory() {
    return this._selectHistory;
  }

  /**
   * Test helper: Get evaluate history
   */
  getEvaluateHistory() {
    return this._evaluateHistory;
  }

  /**
   * Test helper: Get waitForSelector calls
   */
  getWaitForSelectorCalls() {
    return this._waitForSelectorCalls;
  }

  /**
   * Test helper: Update page state (for simulating state changes)
   */
  updateState(newConfig) {
    Object.assign(this, {
      _url: newConfig.url !== undefined ? newConfig.url : this._url,
      _textContent: newConfig.textContent !== undefined ? newConfig.textContent : this._textContent,
      _selectorResults: newConfig.selectorResults !== undefined ? newConfig.selectorResults : this._selectorResults,
    });
  }
}

/**
 * Factory functions for creating common page state mocks
 */

const PageStates = {
  /**
   * Mock 1: Too Early Error Page
   */
  tooEarly: () => new MockPage({
    url: 'https://jct.gametime.net/scheduling/index/bookerror/sport/1/court/50',
    textContent: 'Booking Not Available\nPlease wait until the booking window opens.\nTime: 4:32\nPlease wait 5 minutes'
  }),

  /**
   * Mock 2: Court Held Error Page
   */
  courtHeld: () => new MockPage({
    url: 'https://jct.gametime.net/scheduling/index/bookerror',
    textContent: 'Booking Not Available\nAnother member is currently booking this court. Please try again in a few moments.'
  }),

  /**
   * Mock 3: Form Loaded Successfully
   */
  formLoaded: () => new MockPage({
    url: 'https://jct.gametime.net/scheduling/index/book/sport/1/court/50/date/2025-11-15/time/540',
    selectorResults: {
      'input[name="temp"]': { value: 'abc123temp456' },
      'input[name="players[1][user_id]"]': { value: '12345' },
      'input[name="players[1][name]"]': { value: 'John Doe' },
      'input[type="radio"][name="rtype"][value="13"]': {},
      'input[type="radio"][name="rtype"][value="1"]': {},
      'select[name="duration"]': {}
    },
    allowAllClicks: true,
    allowAllSelects: true,
    evaluateResult: 'mock-recaptcha-token-03Ah8hdj3k2jd9fj3kdf9j3kd',
    waitForFunctionResult: true
  }),

  /**
   * Mock 4: Network Error Page
   */
  networkError: () => new MockPage({
    url: 'https://jct.gametime.net/scheduling/index/error',
    textContent: '500 Internal Server Error\nThe server encountered an unexpected condition.'
  }),

  /**
   * Mock 5: Unknown Error Page
   */
  unknownError: () => new MockPage({
    url: 'https://jct.gametime.net/scheduling/index/bookerror',
    textContent: 'Booking Not Available\nMaintenance in progress. Please try again later.'
  }),

  /**
   * Mock 6: Loading Slow (Form Not Ready)
   */
  loadingSlow: () => new MockPage({
    url: 'https://jct.gametime.net/scheduling/index/book/sport/1/court/50/date/2025-11-15/time/540',
    selectorResults: {
      // temp field intentionally missing (will timeout)
    }
  })
};

module.exports = {
  MockPage,
  PageStates
};
