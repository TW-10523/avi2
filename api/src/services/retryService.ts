/**
 * Retry Service - Intelligent retry logic with exponential backoff
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'retryCondition'>> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      if (config.retryCondition && !config.retryCondition(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = Math.min(exponentialDelay + jitter, config.maxDelayMs);

      // Callback before retry
      config.onRetry?.(attempt, error, delay);

      console.log(`[Retry] Attempt ${attempt}/${config.maxAttempts} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);

      await sleep(delay);
    }
  }

  throw lastError || new Error('All retry attempts failed');
}

/**
 * Circuit breaker for failing services
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailure: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeMs: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should reset
    if (this.state === 'open') {
      if (Date.now() - this.lastFailure > this.resetTimeMs) {
        this.state = 'half-open';
        console.log('[CircuitBreaker] Transitioning to half-open');
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }

    try {
      const result = await fn();
      
      // Success - reset circuit
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
        console.log('[CircuitBreaker] Circuit closed - service recovered');
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'open';
        console.log(`[CircuitBreaker] Circuit opened after ${this.failures} failures`);
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailure: this.lastFailure ? new Date(this.lastFailure).toISOString() : null,
    };
  }

  reset() {
    this.state = 'closed';
    this.failures = 0;
    this.lastFailure = 0;
  }
}

/**
 * Rate limiter to prevent API abuse
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(t => now - t < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }

  getRemainingRequests(key: string): number {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    const validRequests = requests.filter(t => now - t < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Export pre-configured instances
export const llmCircuitBreaker = new CircuitBreaker(3, 30000);
export const solrCircuitBreaker = new CircuitBreaker(5, 60000);
export const apiRateLimiter = new RateLimiter(100, 60000);
