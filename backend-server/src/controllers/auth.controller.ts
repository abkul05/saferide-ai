import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { firebaseAdmin } from '../config/firebase';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../constants/status';
import { AuthenticatedRequest } from '../middleware/auth';

const generateTokens = (userId: string, phoneNumber: string, role: UserRole) => {
  const jwtSecret = process.env.JWT_SECRET || 'saferide_secret_jwt_access_token_sign_key_987654321';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'saferide_secret_jwt_refresh_token_sign_key_123456789';

  const accessToken = jwt.sign(
    { id: userId, phoneNumber, role },
    jwtSecret,
    { expiresIn: '1d' } // Access token valid for 24h
  );

  const refreshToken = jwt.sign(
    { id: userId },
    jwtRefreshSecret,
    { expiresIn: '30d' } // Refresh token valid for 30 days
  );

  return { accessToken, refreshToken };
};

export const verifyOTP = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { firebaseIdToken, role } = req.body;

    logger.info(`Processing OTP verification for role: ${role}`);

    // Verify token via Firebase Admin Service
    const decodedToken = await firebaseAdmin.verifyIdToken(firebaseIdToken);
    
    if (!decodedToken.phone_number) {
      throw new AppError('Firebase token does not contain a verified phone number.', 400);
    }

    const phoneNumber = decodedToken.phone_number;

    // Find or create User
    let user = await User.findOne({ phoneNumber });

    if (!user) {
      logger.info(`Creating new user account for phone: ${phoneNumber}`);
      user = await User.create({
        phoneNumber,
        role: role as UserRole,
        isProfileComplete: false,
      });
    } else {
      logger.info(`Existing user logged in: ${user._id}`);
      // Ensure we don't accidentally override ADMIN role
      if (user.role !== UserRole.ADMIN && user.role !== role) {
        // Option: Update user role, or check restriction. Let's allow role update if requested.
        user.role = role as UserRole;
        await user.save();
      }
    }

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokens(
      user._id.toString(),
      user.phoneNumber,
      user.role
    );

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isProfileComplete: user.isProfileComplete,
        emergencyContacts: user.emergencyContacts,
      },
    });
  } catch (error: any) {
    logger.error(`Error verifying OTP: ${error.message}`);
    next(new AppError(error.message || 'OTP verification failed', 400));
  }
};

export const refreshToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'saferide_secret_jwt_refresh_token_sign_key_123456789';
    
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { id: string };
    
    const user = await User.findById(decoded.id);
    if (!user) {
      throw new AppError('User not found associated with refresh token', 404);
    }

    const tokens = generateTokens(user._id.toString(), user.phoneNumber, user.role);

    res.status(200).json({
      success: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    logger.warn(`Refresh token failed: ${error.message}`);
    next(new AppError('Invalid or expired refresh token', 403));
  }
};
