import { Response, NextFunction } from 'express';
import { Ride } from '../models/Ride';
import { Driver } from '../models/Driver';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { RideStatus, DriverStatus } from '../constants/status';
import { getHaversineDistance, safetyService } from '../services/safety.service';
import { socketManager } from '../sockets/socket.manager';
import { calculateSafetyScore } from '../services/guardian.service';
import { SafetyAlert } from '../models/SafetyAlert';
import { notificationService } from '../services/notification.service';

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

    const { pickup, dropoff, rideType, fare, paymentMethod, distance } = req.body;

    const passengerId = req.user.id;

    // Calculate straight line distance to estimate fare
    const distanceMeters = getHaversineDistance(
      pickup.location.coordinates,
      dropoff.location.coordinates
    );

    const distanceKm = distance || distanceMeters / 1000;
    const finalFare = fare || Math.max(5.00, Number((5.00 + distanceKm * 1.50).toFixed(2)));

    // Generate dynamic OTP code for start verification
    const otpCode = generateOTP();

    // Create interpolation path between pickup and dropoff for mock route coordinates
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
      rideType: rideType || 'Sedan',
      distance: Number(distanceKm.toFixed(2)),
      fare: finalFare,
      otpCode,
      paymentMethod: paymentMethod || 'CASH',
      plannedRouteCoordinates
    });

    logger.info(`Ride request created: ${ride._id} for passenger ${passengerId}`);

    // Broadcast request to nearby available drivers
    socketManager.broadcastToDrivers('ride:request_broadcast', {
      rideId: ride._id,
      pickup: ride.pickup,
      dropoff: ride.dropoff,
      fare: ride.fare,
      rideType: ride.rideType,
      distance: ride.distance
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

    // FCM Notification Trigger: Ride Accepted
    (async () => {
      try {
        const driverUser = await User.findById(driverUserId);
        const driverName = driverUser?.fullName || 'Verified Pilot';
        const passenger = await User.findById(ride.passengerId);
        
        if (passenger && passenger.fcmToken) {
          await notificationService.sendRideAccepted(
            passenger.fcmToken,
            ride._id.toString(),
            driverName,
            driverDetails.vehicle.plateNumber
          );
        }
      } catch (err: any) {
        logger.error(`FCM sendRideAccepted error: ${err.message}`);
      }
    })();

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

    // FCM Notification Trigger: SOS Alert to Emergency Contacts & Emergency Alert to Driver
    (async () => {
      try {
        const passenger = await User.findById(ride.passengerId);
        const passengerName = passenger?.fullName || 'A Passenger';

        // 1. Send push to each registered emergency contact who has FCM token
        if (passenger && passenger.emergencyContacts.length > 0) {
          const shareUrl = `http://localhost:5000/api/v1/rides/share/${ride._id}`;
          for (const contact of passenger.emergencyContacts) {
            const contactUser = await User.findOne({ phoneNumber: contact.phoneNumber });
            if (contactUser && contactUser.fcmToken) {
              await notificationService.sendSOSAlert(
                contactUser.fcmToken,
                passengerName,
                ride._id.toString(),
                shareUrl
              );
            }
          }
        }

        // 2. Send emergency warning push to driver
        if (ride.driverId) {
          const driver = await User.findById(ride.driverId);
          if (driver && driver.fcmToken) {
            await notificationService.sendEmergencyAlert(
              driver.fcmToken,
              ride._id.toString(),
              'SOS Panic triggered by passenger! Ambient safety recording active.'
            );
          }
        }
      } catch (err: any) {
        logger.error(`FCM triggerPanic notifications dispatch error: ${err.message}`);
      }
    })();

    res.status(200).json({
      success: true,
      message: 'SOS panic alert initiated',
      alert,
    });
  } catch (error) {
    next(error);
  }
};

export const shareRide = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId } = req.params;
    const ride = await Ride.findById(rideId);
    if (!ride) {
      res.status(404).send('<h1>Ride Booking not found</h1>');
      return;
    }

    const alerts = await SafetyAlert.find({ rideId });
    const deviationsCount = alerts.filter(a => a.alertType === 'ROUTE_DEVIATION').length;
    const unexpectedStops = alerts.filter(a => a.alertType === 'UNEXPECTED_STOP').length;
    const hasEmergency = alerts.some(a => a.alertType === 'PANIC_SOS');

    let driverRating = 4.8;
    let driverVehicle = { make: 'Tesla', model: 'Model 3', color: 'Pearl White', plateNumber: 'SAFE-RIDE' };
    if (ride.driverId) {
      const driver = await Driver.findOne({ userId: ride.driverId });
      if (driver) {
        driverRating = driver.rating;
        driverVehicle = driver.vehicle;
      }
    }

    const currentHour = new Date().getHours();
    const isNightTime = currentHour >= 22 || currentHour < 5;

    const scoreReport = calculateSafetyScore({
      routeDeviationAlertsCount: deviationsCount,
      driverRating,
      isNightTime,
      averageSpeed: 60,
      unexpectedStopsCount: unexpectedStops,
      isEmergencyTriggered: hasEmergency
    });

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SafeRide AI - Live Guardian Tracking</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #0F0F14; color: #FFFFFF; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #181820; border-radius: 16px; border: 1px solid #2A2A35; padding: 24px; box-shadow: 0 8px 30px rgba(0,0,0,0.5); }
          h1 { font-size: 24px; font-weight: 800; text-align: center; margin-top: 0; color: #10B981; }
          .score-card { background: #20202B; padding: 16px; border-radius: 12px; text-align: center; margin-bottom: 20px; border: 1px solid #333344; }
          .score-val { font-size: 48px; font-weight: 900; color: #10B981; }
          .score-label { font-size: 13px; color: #8E8E93; margin-top: 4px; }
          .severity-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; margin-top: 8px; text-transform: uppercase; }
          .EXCELLENT, .SAFE { background: rgba(16,185,129,0.2); color: #10B981; }
          .CAUTION { background: rgba(245,158,11,0.2); color: #F59E0B; }
          .HIGH_RISK { background: rgba(239,68,68,0.2); color: #EF4444; }
          .info-row { display: flex; justify-content: space-between; border-bottom: 1px solid #2A2A35; padding: 12px 0; font-size: 14px; }
          .info-label { color: #8E8E93; }
          .info-val { font-weight: bold; }
          .alert-list { margin-top: 16px; background: rgba(239,68,68,0.1); border: 1px dashed #EF4444; padding: 12px; border-radius: 8px; font-size: 12px; color: #EF4444; }
          .map-mock { height: 180px; background: #0F0F14; border-radius: 10px; display: flex; justify-content: center; align-items: center; font-size: 48px; margin-bottom: 16px; border: 1px solid #2A2A35; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🛡️ Guardian Live Map</h1>
          <div class="map-mock">🚕🗺️</div>
          
          <div class="score-card">
            <div class="score-val">${scoreReport.score}</div>
            <div class="score-label">AI Safety Score Index</div>
            <div class="severity-badge ${scoreReport.severity}">${scoreReport.severity.replace('_', ' ')}</div>
          </div>

          <div class="info-row">
            <span class="info-label">Ride Booking ID:</span>
            <span class="info-val">${ride._id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Status:</span>
            <span class="info-val" style="color:#10B981">${ride.status}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Pickup Address:</span>
            <span class="info-val">${ride.pickup.address}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Dropoff Address:</span>
            <span class="info-val">${ride.dropoff.address}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Vehicle Specs:</span>
            <span class="info-val">${driverVehicle.color} ${driverVehicle.make} ${driverVehicle.model}</span>
          </div>
          <div class="info-row">
            <span class="info-label">License Plate:</span>
            <span class="info-val">${driverVehicle.plateNumber}</span>
          </div>

          ${scoreReport.deductions.length > 0 ? `
            <div class="alert-list">
              <strong>⚠️ Active Safety Alerts logged:</strong>
              <ul style="margin: 8px 0 0 16px; padding: 0;">
                ${scoreReport.deductions.map(d => `<li>${d}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

export const searchPlaces = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const query = (req.query.q as string) || '';
    if (!query) {
      res.status(200).json({ success: true, predictions: [] });
      return;
    }

    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (key) {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${key}`;
      const response = await fetch(url);
      const data = await response.json();
      res.status(200).json({ success: true, predictions: data.predictions || [] });
    } else {
      const mockPlaces = [
        { description: 'Astoria, Queens, NY, USA', place_id: 'astoria_mock', terms: [{ value: 'Astoria' }] },
        { description: 'Grand Central Terminal, New York, NY, USA', place_id: 'gct_mock', terms: [{ value: 'Grand Central' }] },
        { description: 'Central Park, New York, NY, USA', place_id: 'cp_mock', terms: [{ value: 'Central Park' }] },
        { description: 'Times Square, New York, NY, USA', place_id: 'ts_mock', terms: [{ value: 'Times Square' }] },
        { description: 'JFK International Airport, Queens, NY, USA', place_id: 'jfk_mock', terms: [{ value: 'JFK Airport' }] },
        { description: 'Brooklyn Bridge Park, Brooklyn, NY, USA', place_id: 'bbp_mock', terms: [{ value: 'Brooklyn Bridge' }] }
      ];
      
      const filtered = mockPlaces.filter(p => p.description.toLowerCase().includes(query.toLowerCase()));
      res.status(200).json({
        success: true,
        predictions: filtered
      });
    }
  } catch (error) {
    next(error);
  }
};

export const estimateRide = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { pickupCoords, dropoffCoords } = req.body; // [lng, lat]

    if (!pickupCoords || !dropoffCoords || pickupCoords.length !== 2 || dropoffCoords.length !== 2) {
      throw new AppError('Valid pickupCoords and dropoffCoords arrays [longitude, latitude] are required', 400);
    }

    const distanceMeters = getHaversineDistance(pickupCoords, dropoffCoords);
    const distanceKm = Number((distanceMeters / 1000).toFixed(2));

    const rideTypesList = [
      { type: 'Bike', name: 'SafeRide Bike', capacity: 1, base: 2.00, rate: 0.50, rating: 4.8, image: '🏍️' },
      { type: 'Auto', name: 'SafeRide Auto', capacity: 3, base: 3.00, rate: 0.80, rating: 4.5, image: '🛺' },
      { type: 'Mini', name: 'SafeRide Mini', capacity: 4, base: 4.00, rate: 1.00, rating: 4.6, image: '🚗' },
      { type: 'Sedan', name: 'SafeRide Sedan', capacity: 4, base: 5.00, rate: 1.20, rating: 4.7, image: '🚘' },
      { type: 'SUV', name: 'SafeRide SUV', capacity: 6, base: 8.00, rate: 1.80, rating: 4.8, image: '🚙' },
      { type: 'Premium', name: 'SafeRide Premium', capacity: 4, base: 12.00, rate: 2.50, rating: 4.9, image: '🏎️' }
    ];

    const estimates = rideTypesList.map(item => {
      const fare = Math.max(item.base, Number((item.base + distanceKm * item.rate).toFixed(2)));
      const eta = Math.max(2, Math.round(3 + Math.random() * 8));
      return {
        rideType: item.type,
        name: item.name,
        capacity: item.capacity,
        rating: item.rating,
        fare,
        eta,
        image: item.image
      };
    });

    res.status(200).json({
      success: true,
      distance: distanceKm,
      estimates
    });
  } catch (error) {
    next(error);
  }
};

export const getRideHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const userId = req.user.id;
    const rides = await Ride.find({
      $or: [{ passengerId: userId }, { driverId: userId }]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      rides
    });
  } catch (error) {
    next(error);
  }
};
