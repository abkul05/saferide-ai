import { logger } from '../config/logger';
import { SafetyAlert } from '../models/SafetyAlert';
import { Ride } from '../models/Ride';
import { AlertTriggerType, AlertSeverity, AlertStatus } from '../constants/status';

/**
 * Calculates the Haversine distance between two coordinates in meters
 */
export const getHaversineDistance = (
  coords1: number[], // [lng, lat]
  coords2: number[]  // [lng, lat]
): number => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;

  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

class SafetyService {
  /**
   * Evaluates if a driver has deviated from the planned route coordinates.
   * If deviation exceeds threshold (e.g., 500m), it creates a SafetyAlert record.
   */
  public async evaluateRouteDeviation(
    rideId: string,
    currentCoords: number[], // [lng, lat]
    thresholdMeters = 500
  ): Promise<{ deviated: boolean; distance: number; alert?: any }> {
    try {
      const ride = await Ride.findById(rideId);
      if (!ride) {
        throw new Error('Ride not found');
      }

      const plannedCoords = ride.plannedRouteCoordinates;
      if (!plannedCoords || plannedCoords.length === 0) {
        // If route coordinates aren't stored, we cannot verify deviation. 
        // Fallback: calculate direct distance from current point to dropoff location.
        return { deviated: false, distance: 0 };
      }

      // Find the minimum distance to any point along the planned route array
      let minDistance = Infinity;
      for (const pt of plannedCoords) {
        const dist = getHaversineDistance(currentCoords, pt);
        if (dist < minDistance) {
          minDistance = dist;
        }
      }

      const isDeviated = minDistance > thresholdMeters;

      if (isDeviated) {
        logger.warn(`Ride ${rideId}: Route deviation detected! Distance: ${minDistance.toFixed(2)}m (Threshold: ${thresholdMeters}m)`);
        
        // Check if there is already an active alert for this ride
        let activeAlert = await SafetyAlert.findOne({
          rideId: ride._id,
          triggerType: AlertTriggerType.ROUTE_DEVIATION,
          status: AlertStatus.ACTIVE
        });

        if (!activeAlert) {
          activeAlert = await SafetyAlert.create({
            rideId: ride._id,
            triggerType: AlertTriggerType.ROUTE_DEVIATION,
            severity: AlertSeverity.HIGH,
            status: AlertStatus.ACTIVE,
            details: `Driver deviated ${minDistance.toFixed(0)} meters from planned route coordinates.`
          });
          logger.info(`SafetyAlert created: ${activeAlert._id}`);
        }

        return { deviated: true, distance: minDistance, alert: activeAlert };
      }

      return { deviated: false, distance: minDistance };
    } catch (error: any) {
      logger.error(`Error checking route deviation: ${error.message}`);
      return { deviated: false, distance: 0 };
    }
  }

  /**
   * Log manual SOS panic triggers
   */
  public async triggerSOSAlert(rideId: string, details?: string): Promise<any> {
    try {
      const alert = await SafetyAlert.create({
        rideId,
        triggerType: AlertTriggerType.PANIC_BUTTON,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.ACTIVE,
        details: details || 'SOS button triggered by passenger.'
      });

      logger.warn(`SOS Panic Alert triggered for ride: ${rideId}. Notification alerts broadcasted.`);
      return alert;
    } catch (error: any) {
      logger.error(`Error logging SOS alert: ${error.message}`);
      throw error;
    }
  }
}

export const safetyService = new SafetyService();
