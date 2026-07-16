import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { DriverStatus, UserRole } from '../constants/status';

export const getProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    let driverDetails = null;
    if (user.role === UserRole.DRIVER) {
      driverDetails = await Driver.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user,
      driverDetails,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const { fullName, email, gender, dob, bloodGroup, profilePicture, homeAddress, workAddress } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (email !== undefined) user.email = email;
    if (gender !== undefined) user.gender = gender;
    if (dob !== undefined) user.dob = dob;
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;
    if (homeAddress !== undefined) user.homeAddress = homeAddress;
    if (workAddress !== undefined) user.workAddress = workAddress;
    
    // Validate profile completeness
    if (
      user.fullName && 
      user.email && 
      user.gender && 
      user.dob && 
      user.bloodGroup && 
      user.homeAddress && 
      user.workAddress
    ) {
      user.isProfileComplete = true;
    }

    await user.save();
    logger.info(`Profile updated for user: ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmergencyContacts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const { emergencyContacts } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.emergencyContacts = emergencyContacts;
    await user.save();
    logger.info(`Emergency contacts updated for user: ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'Emergency contacts updated successfully',
      emergencyContacts: user.emergencyContacts,
    });
  } catch (error) {
    next(error);
  }
};

export const registerDriver = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const { vehicle } = req.body;
    if (!vehicle || !vehicle.make || !vehicle.model || !vehicle.color || !vehicle.plateNumber) {
      throw new AppError('Complete vehicle details (make, model, color, plateNumber) are required', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update user role to DRIVER
    user.role = UserRole.DRIVER;
    await user.save();

    // Check if driver details already exist
    let driver = await Driver.findOne({ userId: user._id });

    if (driver) {
      driver.vehicle = vehicle;
      driver.status = DriverStatus.OFFLINE;
      driver.isOnline = false;
      await driver.save();
    } else {
      driver = await Driver.create({
        userId: user._id,
        vehicle,
        isOnline: false,
        status: DriverStatus.OFFLINE,
        liveLocation: {
          type: 'Point',
          coordinates: [0, 0],
        },
      });
    }

    logger.info(`Driver registered successfully for user: ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'Driver registration completed successfully',
      user,
      driverDetails: driver,
    });
  } catch (error) {
    next(error);
  }
};

export const updateFcmToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const { fcmToken } = req.body;
    if (!fcmToken) {
      throw new AppError('fcmToken parameter is required', 400);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    user.fcmToken = fcmToken;
    await user.save();

    logger.info(`FCM Token updated successfully for user ${user._id}`);

    res.status(200).json({
      success: true,
      message: 'FCM Token updated successfully',
      fcmToken: user.fcmToken
    });
  } catch (error) {
    next(error);
  }
};
