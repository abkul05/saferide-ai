import { Response, NextFunction } from 'express';
import { Ride } from '../models/Ride';
import { Driver } from '../models/Driver';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { RideStatus, DriverStatus } from '../constants/status';
import { getHaversineDistance, safetyService } from '../services/safety.service';
import { socketManager } from '../sockets/socket.manager';

// Helper to generate a random 4-digit OTP code
const generateOTP = (): string => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export const requestRide = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const { pickup, dropoff } = req.body;

    const passengerId = req.user.id;

    // Calculate straight line distance to estimate fare
    const distanceMeters = getHaversineDistance(
      pickup.location.coordinates,
      dropoff.location.coordinates
    );

    // Rate: Base $5.00 + $1.50 per km
    const distanceKm = distanceMeters / 1000;
    const fare = Math.max(5.00, Number((5.00 + distanceKm * 1.50).toFixed(2)));

    // Generate dynamic OTP code for start verification
    const otpCode = generateOTP();

    // Create interpolation path between pickup and dropoff for mock route coordinates
    // In production, coordinates are populated from the Google Maps Directions API polyline decode
    const plannedRouteCoordinates: number[][] = [];
    const steps = 10;
    const [pLng, pLat] = pickup.location.coordinates;
    const [dLng, dLat] = dropoff.location.coordinates;

    for (let i = 0; i <= steps; i++) {
      const fraction = i / steps;
      const lng = pLng + (dLng - pLng) * fraction;
      const lat = pLat + (dLat - pLat) * fraction;
      plannedRouteCoordinates.push([lng, lat]);
    }

    const ride = await Ride.create({
      passengerId,
      status: RideStatus.REQUESTED,
      pickup,
      dropoff,
      fare,
      otpCode,
      plannedRouteCoordinates
    });

    logger.info(`Ride request created: ${ride._id} for passenger ${passengerId}`);

    // Broadcast request to nearby available drivers
    // For this prototype, we broadcast to the general online drivers namespace
    socketManager.broadcastToDrivers('ride:request_broadcast', {
      rideId: ride._id,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      fare: ride.fare,
    });

    res.status(201).json({
      success: true,
      message: 'Ride request created successfully',
      ride,
    });
  } catch (error) {
    next(error);
  }
};

export const acceptRide = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const { rideId } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new AppError('Ride request not found', 404);
    }

    if (ride.status !== RideStatus.REQUESTED) {
      throw new AppError('Ride request is no longer available', 400);
    }

    const driverUserId = req.user.id;
    const driverDetails = await Driver.findOne({ userId: driverUserId });
    
    if (!driverDetails) {
      throw new AppError('Driver configuration profile not found', 403);
    }

    // Accept ride
    ride.driverId = driverDetails.userId;
    ride.status = RideStatus.ACCEPTED;
    await ride.save();

    // Mark driver status busy
    driverDetails.status = DriverStatus.BUSY;
    await driverDetails.save();

    logger.info(`Ride ${rideId} accepted by driver ${driverUserId}`);

    // Notify passenger via socket
    socketManager.sendToUser(ride.passengerId.toString(), 'ride:status_updated', {
      rideId: ride._id,
      status: ride.status,
      driver: {
        userId: driverDetails.userId,
        vehicle: driverDetails.vehicle,
        rating: driverDetails.rating,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Ride accepted successfully',
      ride,
    });
  } catch (error) {
    next(error);
  }
};

export const startRide = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, otpCode } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    if (ride.otpCode !== otpCode) {
      throw new AppError('Invalid OTP verification code. Cannot start ride.', 400);
    }

    if (ride.status !== RideStatus.ACCEPTED) {
      throw new AppError('Ride status must be ACCEPTED to start.', 400);
    }

    ride.status = RideStatus.IN_PROGRESS;
    await ride.save();

    logger.info(`Ride ${rideId} started successfully (OTP Verified).`);

    // Notify passenger via socket
    socketManager.sendToUser(ride.passengerId.toString(), 'ride:status_updated', {
      rideId: ride._id,
      status: ride.status,
    });

    res.status(200).json({
      success: true,
      message: 'Ride started successfully (OTP verified)',
      ride,
    });
  } catch (error) {
    next(error);
  }
};

export const completeRide = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    ride.status = RideStatus.COMPLETED;
    await ride.save();

    // Release driver back online
    if (ride.driverId) {
      await Driver.findOneAndUpdate(
        { userId: ride.driverId },
        { status: DriverStatus.AVAILABLE }
      );
    }

    logger.info(`Ride ${rideId} completed successfully.`);

    // Notify passenger via socket
    socketManager.sendToUser(ride.passengerId.toString(), 'ride:status_updated', {
      rideId: ride._id,
      status: ride.status,
    });

    res.status(200).json({
      success: true,
      message: 'Ride completed successfully',
      ride,
    });
  } catch (error) {
    next(error);
  }
};

export const triggerPanic = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, details } = req.body;

    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    // Log the SOS emergency alert
    const alert = await safetyService.triggerSOSAlert(rideId, details);

    // Broadcast urgent Socket warning to both passenger and driver room, and general admin panel
    socketManager.sendToUser(ride.passengerId.toString(), 'safety:panic_alert', {
      alertId: alert._id,
      rideId,
      message: 'SOS Panic triggered. Authorities and emergency contacts notified.',
    });

    if (ride.driverId) {
      socketManager.sendToUser(ride.driverId.toString(), 'safety:panic_alert', {
        alertId: alert._id,
        rideId,
        message: 'SOS Panic triggered by passenger. Standard investigation recording active.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'SOS panic alert initiated',
      alert,
    });
  } catch (error) {
    next(error);
  }
};
