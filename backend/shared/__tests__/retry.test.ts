import { withRetry, withDatabaseRetry, withApiRetry, withCircuitBreaker } from '../utils/retry';

describe('Retry Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';
      
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, { maxAttempts: 2, baseDelay: 100 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Validation error'));
      
      await expect(withRetry(operation)).rejects.toThrow('Validation error');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should respect maxAttempts', async () => {
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';
      
      const operation = jest.fn().mockRejectedValue(error);
      
      await expect(withRetry(operation, { maxAttempts: 3, baseDelay: 100 }))
        .rejects.toThrow('Connection refused');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should call onRetry callback', async () => {
      const onRetry = jest.fn();
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';
      
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      await withRetry(operation, { 
        maxAttempts: 2, 
        baseDelay: 100,
        onRetry 
      });
      
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it('should use exponential backoff', async () => {
      const error = new Error('Connection refused');
      (error as any).code = 'ECONNREFUSED';
      
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');
      
      const result = await withRetry(operation, { 
        maxAttempts: 3, 
        baseDelay: 100,
        backoffFactor: 2
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('withDatabaseRetry', () => {
    it('should retry on database errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ name: 'MongoNetworkError' })
        .mockResolvedValue('success');
      
      const result = await withDatabaseRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-database errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Validation error'));
      
      await expect(withDatabaseRetry(operation)).rejects.toThrow('Validation error');
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('withApiRetry', () => {
    it('should retry on API errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ 
          response: { status: 500 },
          code: 'ECONNREFUSED' 
        })
        .mockResolvedValue('success');
      
      const result = await withApiRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx status codes', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce({ response: { status: 503 } })
        .mockResolvedValue('success');
      
      const result = await withApiRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx status codes', async () => {
      const operation = jest.fn().mockRejectedValue({ response: { status: 400 } });
      
      await expect(withApiRetry(operation)).rejects.toEqual({ response: { status: 400 } });
      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('withCircuitBreaker', () => {
    it('should work normally when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const circuitBreakerOperation = withCircuitBreaker(operation);
      
      const result = await circuitBreakerOperation();
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should open circuit after failure threshold', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));
      const circuitBreakerOperation = withCircuitBreaker(operation, {
        failureThreshold: 2
      });
      
      // First failure
      await expect(circuitBreakerOperation()).rejects.toThrow('Service error');
      
      // Second failure - should open circuit
      await expect(circuitBreakerOperation()).rejects.toThrow('Service error');
      
      // Third call - should be rejected by circuit breaker
      await expect(circuitBreakerOperation()).rejects.toThrow('Circuit breaker is OPEN');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should reset circuit after timeout', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Service error'))
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValue('success');
      
      const circuitBreakerOperation = withCircuitBreaker(operation, {
        failureThreshold: 2,
        resetTimeout: 1000
      });
      
      // Trigger circuit opening
      await expect(circuitBreakerOperation()).rejects.toThrow('Service error');
      await expect(circuitBreakerOperation()).rejects.toThrow('Service error');
      
      // Circuit should be open
      await expect(circuitBreakerOperation()).rejects.toThrow('Circuit breaker is OPEN');
      
      // Fast-forward time to reset circuit
      jest.advanceTimersByTime(1001);
      
      // Should work again (half-open state)
      const result = await circuitBreakerOperation();
      expect(result).toBe('success');
    });
  });
});