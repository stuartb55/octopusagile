export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  minInterval: number;
  maxRetries: number;
  timeoutMs: number;
}

export class RateLimitError extends Error {
  public retryAfter?: number;
  constructor(message: string, retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class RateLimiter {
  private requests: number[] = [];
  private lastRequest = 0;
  private readonly options: RateLimitOptions;

  constructor(options: Partial<RateLimitOptions> = {}) {
    this.options = {
      maxRequests: 60, // 60 requests per window
      windowMs: 60 * 1000, // 1 minute window
      minInterval: 1000, // 1 second between requests
      maxRetries: 3,
      timeoutMs: 10000, // 10 second timeout
      ...options,
    };
  }

  private cleanOldRequests(): void {
    const now = Date.now();
    this.requests = this.requests.filter(
      (timestamp) => now - timestamp < this.options.windowMs
    );
  }

  private canMakeRequest(): { allowed: boolean; retryAfter?: number } {
    this.cleanOldRequests();

    // Check request count limit
    if (this.requests.length >= this.options.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const retryAfter = Math.ceil((oldestRequest + this.options.windowMs - Date.now()) / 1000);
      return { allowed: false, retryAfter };
    }

    // Check minimum interval
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.options.minInterval) {
      const retryAfter = Math.ceil((this.options.minInterval - timeSinceLastRequest) / 1000);
      return { allowed: false, retryAfter };
    }

    return { allowed: true };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
    
    await this.delay(delay + jitter);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        // Check rate limit
        const { allowed, retryAfter } = this.canMakeRequest();
        if (!allowed) {
          if (retryAfter && retryAfter <= 60) { // Only wait if retry time is reasonable
            await this.delay(retryAfter * 1000);
          } else {
            throw new RateLimitError(
              `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
              retryAfter
            );
          }
        }

        // Record request
        const now = Date.now();
        this.requests.push(now);
        this.lastRequest = now;

        // Execute with timeout
        return await this.withTimeout(fn(), this.options.timeoutMs);

      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain types of errors
        if (
          error instanceof TimeoutError ||
          error instanceof RateLimitError ||
          (error instanceof Error && 'status' in error && 
            (error.status === 401 || error.status === 403 || error.status === 404))
        ) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.options.maxRetries) {
          break;
        }

        // Apply exponential backoff before retry
        await this.exponentialBackoff(attempt);
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  getStats(): {
    recentRequests: number;
    windowMs: number;
    canMakeRequest: boolean;
    nextAvailableTime?: Date;
  } {
    this.cleanOldRequests();
    const { allowed, retryAfter } = this.canMakeRequest();

    return {
      recentRequests: this.requests.length,
      windowMs: this.options.windowMs,
      canMakeRequest: allowed,
      nextAvailableTime: retryAfter 
        ? new Date(Date.now() + retryAfter * 1000)
        : undefined,
    };
  }
}

// Global rate limiter instance for Octopus Energy API
export const octopusApiRateLimiter = new RateLimiter({
  maxRequests: 30, // Conservative limit for Octopus Energy API
  windowMs: 60 * 1000, // 1 minute window
  minInterval: 2000, // 2 seconds between requests
  maxRetries: 3,
  timeoutMs: 15000, // 15 second timeout
});