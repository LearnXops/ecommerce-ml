import { useCallback } from 'react';
import { useNotification } from '@/contexts/NotificationContext';
import { handleApiError, withRetry } from '@/utils/api';
import { AxiosResponse } from 'axios';

interface UseErrorHandlerOptions {
  showNotification?: boolean;
  logError?: boolean;
  retryAttempts?: number;
}

export const useErrorHandler = (options: UseErrorHandlerOptions = {}) => {
  const { showError } = useNotification();
  const {
    showNotification = true,
    logError = true,
    retryAttempts = 0
  } = options;

  const handleError = useCallback((error: any, customMessage?: string) => {
    const errorMessage = customMessage || handleApiError(error);
    
    if (logError) {
      console.error('Error handled:', {
        error,
        message: errorMessage,
        timestamp: new Date().toISOString(),
        stack: error?.stack,
        response: error?.response?.data
      });
    }

    if (showNotification) {
      showError(errorMessage);
    }

    return errorMessage;
  }, [showError, showNotification, logError]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    customErrorMessage?: string
  ): Promise<T | null> => {
    try {
      if (retryAttempts > 0) {
        return await withRetry(
          operation as () => Promise<AxiosResponse<T>>,
          retryAttempts
        ) as T;
      }
      return await operation();
    } catch (error) {
      handleError(error, customErrorMessage);
      return null;
    }
  }, [handleError, retryAttempts]);

  const executeWithErrorHandlingAndThrow = useCallback(async <T>(
    operation: () => Promise<T>,
    customErrorMessage?: string
  ): Promise<T> => {
    try {
      if (retryAttempts > 0) {
        return await withRetry(
          operation as () => Promise<AxiosResponse<T>>,
          retryAttempts
        ) as T;
      }
      return await operation();
    } catch (error) {
      handleError(error, customErrorMessage);
      throw error;
    }
  }, [handleError, retryAttempts]);

  return {
    handleError,
    executeWithErrorHandling,
    executeWithErrorHandlingAndThrow
  };
};