import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';

interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  hideNotification: (id?: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="up" />;
}

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  maxNotifications = 3 
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = () => Math.random().toString(36).substring(2, 15);

  const showNotification = (
    message: string, 
    severity: AlertColor = 'info', 
    duration: number = 6000
  ) => {
    const id = generateId();
    const notification: Notification = {
      id,
      message,
      severity,
      duration
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      // Keep only the latest notifications
      return newNotifications.slice(0, maxNotifications);
    });

    // Auto-hide notification after duration
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
  };

  const showError = (message: string, duration: number = 8000) => {
    showNotification(message, 'error', duration);
  };

  const showSuccess = (message: string, duration: number = 4000) => {
    showNotification(message, 'success', duration);
  };

  const showWarning = (message: string, duration: number = 6000) => {
    showNotification(message, 'warning', duration);
  };

  const showInfo = (message: string, duration: number = 6000) => {
    showNotification(message, 'info', duration);
  };

  const hideNotification = (id?: string) => {
    if (id) {
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } else {
      // Hide the most recent notification
      setNotifications(prev => prev.slice(1));
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        showNotification,
        showError,
        showSuccess,
        showWarning,
        showInfo,
        hideNotification,
      }}
    >
      {children}
      
      {/* Render notifications */}
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          TransitionComponent={SlideTransition}
          sx={{
            mt: index * 7, // Stack notifications vertically
          }}
        >
          <Alert
            onClose={() => hideNotification(notification.id)}
            severity={notification.severity}
            variant="filled"
            sx={{ width: '100%', minWidth: 300 }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};