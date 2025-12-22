import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log to console for development
  logger.error(err.stack);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new Error(message);
    error.statusCode = StatusCodes.NOT_FOUND;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new Error(message);
    error.statusCode = StatusCodes.BAD_REQUEST;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error = new Error(message);
    error.statusCode = StatusCodes.BAD_REQUEST;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Not authorized, token failed';
    error = new Error(message);
    error.statusCode = StatusCodes.UNAUTHORIZED;
  }

  // JWT expired
  if (err.name === 'TokenExpiredError') {
    const message = 'Your token has expired. Please log in again.';
    error = new Error(message);
    error.statusCode = StatusCodes.UNAUTHORIZED;
  }

  // Default to 500 server error
  res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(StatusCodes.NOT_FOUND);
  next(error);
};

export { errorHandler, notFound };
