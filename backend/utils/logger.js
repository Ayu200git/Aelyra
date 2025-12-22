import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const { combine, timestamp, printf, colorize, align } = winston.format;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const logFormat = printf(({ level, message, timestamp, stack }) => {
  const formattedMessage = stack || message;
  return `${timestamp} [${level}]: ${formattedMessage}`;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    align(),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  defaultMeta: { service: 'aelyra-backend' },
  transports: [
    // Write all logs with importance level of 'error' or less to 'error.log'
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Write all logs with importance level of 'info' or less to 'combined.log'
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  exitOnError: false, // Don't exit on handled exceptions
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

// Create a stream object with a 'write' function that will be used by morgan
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  },
};

export { logger };
