import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { subscribeToLoadingState } from '@/utils/api';
import { Backdrop, CircularProgress, Box, Typography } from '@mui/material';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

interface LoadingProviderProps {
  children: ReactNode;
  showGlobalLoader?: boolean;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ 
  children, 
  showGlobalLoader = true 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading...');
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    // Subscribe to API loading state
    const unsubscribe = subscribeToLoadingState(setApiLoading);
    return unsubscribe;
  }, []);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  const setLoadingMessageHandler = (message: string) => {
    setLoadingMessage(message);
  };

  const shouldShowLoader = isLoading || apiLoading;

  return (
    <LoadingContext.Provider
      value={{
        isLoading: shouldShowLoader,
        setLoading,
        loadingMessage,
        setLoadingMessage: setLoadingMessageHandler,
      }}
    >
      {children}
      {showGlobalLoader && shouldShowLoader && (
        <Backdrop
          sx={{
            color: '#fff',
            zIndex: (theme) => theme.zIndex.drawer + 1,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
          open={shouldShowLoader}
        >
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={2}
          >
            <CircularProgress color="inherit" size={60} />
            <Typography variant="h6" component="div">
              {loadingMessage}
            </Typography>
          </Box>
        </Backdrop>
      )}
    </LoadingContext.Provider>
  );
};

// Hook for managing async operations with loading states
export const useAsyncOperation = () => {
  const { setLoading, setLoadingMessage } = useLoading();

  const executeWithLoading = async <T,>(
    operation: () => Promise<T>,
    message: string = 'Loading...'
  ): Promise<T> => {
    try {
      setLoadingMessage(message);
      setLoading(true);
      return await operation();
    } finally {
      setLoading(false);
    }
  };

  return { executeWithLoading };
};