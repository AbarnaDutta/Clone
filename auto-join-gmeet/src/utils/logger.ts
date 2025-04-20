import winston from 'winston';

// Create a logger with customized formatting
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(info => {
      const { timestamp, level, message, ...rest } = info;
      const extraInfo = Object.keys(rest).length 
        ? JSON.stringify(rest, null, 2) 
        : '';
      
      return `[${timestamp}] ${level.toUpperCase()}: ${message} ${extraInfo}`;
    })
  ),
  transports: [
    // Write logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write logs to file
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});

// Create directories if they don't exist
import { mkdirSync } from 'fs';
try {
  mkdirSync('logs');
} catch (err) {
  // Directory already exists
} 