import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const { combine, timestamp, printf, colorize, json } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (stack) msg += `\n${stack}`;
  if (Object.keys(metadata).length > 0) msg += `\n${JSON.stringify(metadata, null, 2)}`;
  return msg;
});

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Create logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  transports: [
    // Console transport
    new transports.Console({
      format: combine(
        colorize(),
        logFormat
      )
    }),

    // Daily rotating file transport for errors
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error',
      format: logFormat
    }),

    // Daily rotating file transport for all logs
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: logFormat
    })
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logsDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  exitOnError: false
});

// Add request context to logs
export const createRequestLogger = (req: Request) => {
  const requestId = (req as any).headers['x-request-id'] || Math.random().toString(36).substring(2, 9);
  const userAgent = (req as any).headers['user-agent'] || 'unknown';

  return {
    info: (message: string, meta?: any) => logger.info(message, { requestId, userAgent, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { requestId, userAgent, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { requestId, userAgent, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { requestId, userAgent, ...meta }),
    child: (context: any) => logger.child({ requestId, userAgent, ...context })
  };
};

// Global logger methods
export const log = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
  child: (context: any) => logger.child(context)
};

export default logger;