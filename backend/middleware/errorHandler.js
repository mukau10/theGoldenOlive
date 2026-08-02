/**
 * Global Error Handler Middleware
 */

import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Er is een serverfout opgetreden';

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Ongeldige token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token is verlopen';
  }

  // MySQL errors
  if (err.code === 'ER_DUP_ENTRY') {
    statusCode = 409;
    message = 'Dit item bestaat al';
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    statusCode = 400;
    message = 'Ongeldige referentie';
  }

  const isOperational = err.isOperational === true || (statusCode >= 400 && statusCode < 500);

  if (isOperational && statusCode < 500) {
    logger.warn('Request rejected', {
      statusCode,
      message,
      path: req.originalUrl,
      method: req.method
    });
  } else {
    logger.error('Unhandled error', {
      statusCode,
      message,
      path: req.originalUrl,
      method: req.method,
      stack: err.stack
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err.code && typeof err.code === 'string' && !err.code.startsWith('ER_') ? { code: err.code } : {}),
      ...(err.details ? { details: err.details } : {}),
      ...(process.env.NODE_ENV === 'development' && !isOperational ? { stack: err.stack } : {})
    }
  });
};

// Custom error class
export class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (details && typeof details === 'object') {
      if (details.code) this.code = details.code;
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}
