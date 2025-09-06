import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useErrorHandler } from '../useErrorHandler';
import { NotificationProvider } from '@/contexts/NotificationContext';
import React from 'react';

// Mock the API utility
vi.mock('@/utils/api', () => ({
  handleApiError: vi.fn((error) => {
    if (error.response?.data?.error?.message) {
      return error.response.data.error.message;
    }
    return 'Mocked error message';
  }),
  withRetry: vi.fn((operation) => operation())
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <NotificationProvider>{children}</NotificationProvider>
);

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
  });

  it('handles errors with default options', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    
    const error = new Error('Test error');
    
    await act(async () => {
      const message = result.current.handleError(error);
      expect(message).toBe('Test error');
    });

    expect(console.error).toHaveBeenCalledWith(
      'Error handled:',
      expect.objectContaining({
        error,
        message: 'Test error'
      })
    );
  });

  it('handles errors with custom message', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    
    const error = new Error('Test error');
    const customMessage = 'Custom error message';
    
    await act(async () => {
      const message = result.current.handleError(error, customMessage);
      expect(message).toBe(customMessage);
    });
  });

  it('executes operation with error handling', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    
    const successOperation = vi.fn().mockResolvedValue('success');
    
    await act(async () => {
      const result_value = await result.current.executeWithErrorHandling(successOperation);
      expect(result_value).toBe('success');
    });

    expect(successOperation).toHaveBeenCalledTimes(1);
  });

  it('handles operation errors gracefully', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    
    const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
    
    await act(async () => {
      const result_value = await result.current.executeWithErrorHandling(failingOperation);
      expect(result_value).toBeNull();
    });

    expect(failingOperation).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalled();
  });

  it('throws error when using executeWithErrorHandlingAndThrow', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    
    const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'));
    
    await act(async () => {
      await expect(
        result.current.executeWithErrorHandlingAndThrow(failingOperation)
      ).rejects.toThrow('Operation failed');
    });

    expect(console.error).toHaveBeenCalled();
  });

  it('respects showNotification option', async () => {
    const { result } = renderHook(
      () => useErrorHandler({ showNotification: false }),
      { wrapper }
    );
    
    const error = new Error('Test error');
    
    await act(async () => {
      result.current.handleError(error);
    });

    // Should still log error but not show notification
    expect(console.error).toHaveBeenCalled();
  });

  it('respects logError option', async () => {
    const { result } = renderHook(
      () => useErrorHandler({ logError: false }),
      { wrapper }
    );
    
    const error = new Error('Test error');
    
    await act(async () => {
      result.current.handleError(error);
    });

    expect(console.error).not.toHaveBeenCalled();
  });

  it('handles API errors with specific error codes', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    
    const apiError = {
      response: {
        status: 401,
        data: {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          }
        }
      }
    };
    
    await act(async () => {
      const message = result.current.handleError(apiError);
      expect(message).toBe('Please log in to continue.');
    });
  });

  it('handles network errors', async () => {
    const { result } = renderHook(() => useErrorHandler(), { wrapper });
    
    const networkError = {
      code: 'ECONNREFUSED',
      message: 'Network Error'
    };
    
    await act(async () => {
      const message = result.current.handleError(networkError);
      expect(message).toBe('Unable to connect to the server. Please check your internet connection.');
    });
  });
});