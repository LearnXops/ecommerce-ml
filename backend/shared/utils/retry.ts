import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and temporary database issues
    return (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ECONNRESET' ||
      error.name === 'MongoNetworkError' ||
      error.name === 'MongoTimeoutError' ||
      (error.name === 'MongoServerError' && error.code >= 11000 && error.code < 12000) ||
      (error.response && error.response.status >= 500)
    );
  },
  onRetry: (error: any, attempt: number) => {
    logger.warn(`Retrying operation (attempt ${attempt}):`, {
      error: error.message,
      code: error.code,
      name: error.name
    });
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...defaultOptions, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt or if retry condition is not met
      if (attempt === config.maxAttempts || !config.retryCondition(error)) {
        throw error;
      }

      // Call retry callback
      config.onRetry(error, attempt);

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError;
}

// Specialized retry functions for common scenarios
export const withDatabaseRetry = <T>(operation: () => Promise<T>) => {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 500,
    retryCondition: (error: any) => {
      return (
        error.name === 'MongoNetworkError' ||
        error.name === 'MongoTimeoutError' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT'
      );
    }
  });
};

export const withApiRetry = <T>(operation: () => Promise<T>) => {
  return withRetry(operation, {
    maxAttempts: 3,
    baseDelay: 1000,
    retryCondition: (error: any) => {
      return (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        (error.response && error.response.status >= 500)
      );
    }
  });
};

export const withCircuitBreaker = <T>(
  operation: () => Promise<T>,
  circuitBreakerOptions: {
    failureThreshold?: number;
    resetTimeout?: number;
    monitoringPeriod?: number;
  } = {}
) => {
  const {
    failureThreshold = 5,
    resetTimeout = 60000, // 1 minute
    monitoringPeriod = 10000 // 10 seconds
  } = circuitBreakerOptions;

  let failures = 0;
  let lastFailureTime = 0;
  let state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  return async (): Promise<T> => {
    const now = Date.now();

    // Reset circuit breaker if enough time has passed
    if (state === 'OPEN' && now - lastFailureTime > resetTimeout) {
      state = 'HALF_OPEN';
      failures = 0;
    }

    // Reject immediately if circuit is open
    if (state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }

    try {
      const result = await operation();
      
      // Reset on success
      if (state === 'HALF_OPEN') {
        state = 'CLOSED';
      }
      failures = 0;
      
      return result;
    } catch (error) {
      failures++;
      lastFailureTime = now;

      // Open circuit if failure threshold is reached
      if (failures >= failureThreshold) {
        state = 'OPEN';
        logger.error('Circuit breaker opened due to repeated failures', {
          failures,
          failureThreshold,
          service: operation.name
        });
      }

      throw error;
    }
  };
};