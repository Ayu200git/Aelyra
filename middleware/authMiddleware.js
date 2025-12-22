import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

// Protect routes
export const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      logger.warn('No token found in request');
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Not authorized to access this route - No token',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        logger.warn(`No user found for token: ${token.substring(0, 10)}...`);
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          error: 'User not found',
        });
      }

      req.user = user;
      next();
    } catch (err) {
      logger.error(`Token verification error: ${err.message}`);
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Not authorized to access this route - Invalid token',
      });
    }
  } catch (err) {
    logger.error(`Protect middleware error: ${err.message}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Authentication error',
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};
