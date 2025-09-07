import winston from 'winston';
import path from 'path';
import { performance } from 'perf_hooks';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
  trace: 'gray'
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, requestId, userId, ...meta } = info;
    
    const logEntry = {
      timestamp,
      level,
      message,
      service: service || process.env.SERVICE_NAME || 'unknown',
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...(Object.keys(meta).length > 0 && { meta })
    };
    
    return JSON.stringify(logEntry);
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => {
    const { timestamp, level, message, service, requestId, userId, ...meta } = info;
    
    let logLine = `${timestamp} [${service || 'APP'}] ${level}: ${message}`;
    
    if (requestId && typeof requestId === 'string') logLine += ` [req:${requestId.slice(-8)}]`;
    if (userId && typeof userId === 'string') logLine += ` [user:${userId.slice(-8)}]`;
    
    if (Object.keys(meta).length > 0) {
      logLine += ` ${JSON.stringify(meta)}`;
    }
    
    return logLine;
  })
);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    format: process.env.NODE_ENV === 'production' ? structuredFormat : consoleFormat,
  }),
  // File transport for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: structuredFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: structuredFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
  }),
  // Separate file for HTTP requests
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/http.log'),
    level: 'http',
    format: structuredFormat,
    maxsize: 20 * 1024 * 1024, // 20MB
    maxFiles: 5,
  })
];

// Add performance log file in production
if (process.env.NODE_ENV === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/performance.log'),
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.printf((info) => {
          // Only log performance-related entries
          if (info.type === 'performance' || info.responseTime || info.duration) {
            return JSON.stringify(info);
          }
          return '';
        })
      ),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const baseLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  transports,
  // Do not exit on handled exceptions
  exitOnError: false,
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/exceptions.log'),
      format: structuredFormat
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/rejections.log'),
      format: structuredFormat
    })
  ]
});

// Enhanced logger with additional methods
class EnhancedLogger {
  private logger: winston.Logger;
  private defaultMeta: Record<string, any> = {};

  constructor(logger: winston.Logger) {
    this.logger = logger;
  }

  // Set default metadata for all log entries
  setDefaultMeta(meta: Record<string, any>): void {
    this.defaultMeta = { ...this.defaultMeta, ...meta };
  }

  // Clear default metadata
  clearDefaultMeta(): void {
    this.defaultMeta = {};
  }

  // Create child logger with additional context
  child(meta: Record<string, any>): EnhancedLogger {
    const childLogger = new EnhancedLogger(this.logger);
    childLogger.setDefaultMeta({ ...this.defaultMeta, ...meta });
    return childLogger;
  }

  // Standard log methods
  error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, { ...this.defaultMeta, ...meta });
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, { ...this.defaultMeta, ...meta });
  }

  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, { ...this.defaultMeta, ...meta });
  }

  http(message: string, meta?: Record<string, any>): void {
    this.logger.http(message, { ...this.defaultMeta, ...meta });
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, { ...this.defaultMeta, ...meta });
  }

  trace(message: string, meta?: Record<string, any>): void {
    this.logger.log('trace', message, { ...this.defaultMeta, ...meta });
  }

  // Performance logging
  performance(operation: string, duration: number, meta?: Record<string, any>): void {
    this.logger.info(`Performance: ${operation}`, {
      ...this.defaultMeta,
      type: 'performance',
      operation,
      duration,
      ...meta
    });
  }

  // Security logging
  security(event: string, meta?: Record<string, any>): void {
    this.logger.warn(`Security: ${event}`, {
      ...this.defaultMeta,
      type: 'security',
      event,
      ...meta
    });
  }

  // Business event logging
  business(event: string, meta?: Record<string, any>): void {
    this.logger.info(`Business: ${event}`, {
      ...this.defaultMeta,
      type: 'business',
      event,
      ...meta
    });
  }

  // Audit logging
  audit(action: string, meta?: Record<string, any>): void {
    this.logger.info(`Audit: ${action}`, {
      ...this.defaultMeta,
      type: 'audit',
      action,
      timestamp: new Date().toISOString(),
      ...meta
    });
  }

  // Timer utility
  timer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.performance(label, duration);
    };
  }

  // Async operation wrapper with automatic logging
  async withLogging<T>(
    operation: string,
    fn: () => Promise<T>,
    meta?: Record<string, any>
  ): Promise<T> {
    const start = performance.now();
    this.debug(`Starting ${operation}`, meta);
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.performance(operation, duration, { success: true, ...meta });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.error(`Failed ${operation}`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        success: false,
        ...meta
      });
      throw error;
    }
  }

  // Log with correlation ID
  withCorrelationId(correlationId: string): EnhancedLogger {
    return this.child({ correlationId });
  }

  // Log with request context
  withRequest(req: any): EnhancedLogger {
    return this.child({
      requestId: req.id || req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id
    });
  }
}

// Create enhanced logger instance
const logger = new EnhancedLogger(baseLogger);

// Set service name from environment
if (process.env.SERVICE_NAME) {
  logger.setDefaultMeta({ service: process.env.SERVICE_NAME });
}

export { logger, EnhancedLogger };

// Export utility functions
export function createLogger(serviceName: string): EnhancedLogger {
  return logger.child({ service: serviceName });
}

export function getRequestLogger(req: any): EnhancedLogger {
  return logger.withRequest(req);
}