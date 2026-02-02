/**
 * Authentication Middleware
 */

import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { AppError } from './errorHandler.js';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Geen autorisatie token gevonden', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database with permissions
    const users = await query(
      'SELECT id, email, name, role, permissions FROM users WHERE id = ? AND is_active = 1',
      [decoded.id]
    );

    if (users.length === 0) {
      throw new AppError('Gebruiker niet gevonden of inactief', 401);
    }

    // Parse permissions if string
    const user = users[0];
    if (user.permissions && typeof user.permissions === 'string') {
      try {
        user.permissions = JSON.parse(user.permissions);
      } catch {
        user.permissions = [];
      }
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new AppError('Ongeldige of verlopen token', 401));
    }
    next(error);
  }
};

/**
 * Check if user is admin
 */
export const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return next(new AppError('Toegang geweigerd. Admin rechten vereist.', 403));
  }
  next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const users = await query(
        'SELECT id, email, name, role FROM users WHERE id = ? AND is_active = 1',
        [decoded.id]
      );
      
      if (users.length > 0) {
        req.user = users[0];
      }
    }
  } catch (error) {
    // Ignore auth errors for optional auth
  }
  next();
};
