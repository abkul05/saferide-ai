import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../constants/status';
import { logger } from '../config/logger';

export interface DecodedUser {
  id: string;
  phoneNumber: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: DecodedUser;
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Access Denied: No Token Provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const jwtSecret = process.env.JWT_SECRET || 'saferide_secret_jwt_access_token_sign_key_987654321';
    const decoded = jwt.verify(token, jwtSecret) as DecodedUser;
    
    req.user = decoded;
    next();
  } catch (error: any) {
    logger.warn(`JWT verification failed: ${error.message}`);
    res.status(403).json({ success: false, message: 'Invalid or Expired Token' });
  }
};

export const requireRole = (roles: UserRole | UserRole[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized: User Context Missing' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ 
        success: false, 
        message: `Forbidden: Requires one of these roles: [${allowedRoles.join(', ')}]` 
      });
      return;
    }

    next();
  };
};
