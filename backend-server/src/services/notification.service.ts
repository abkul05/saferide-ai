import { firebaseAdmin } from '../config/firebase';
import { logger } from '../config/logger';

class NotificationService {
  /**
   * Dispatches a push notification via Firebase Admin SDK Messaging
   */
  public async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data: Record<string, string> = {}
  ): Promise<boolean> {
    try {
      if (!fcmToken) {
        logger.warn('FCM dispatch cancelled: Empty target token.');
        return false;
      }

      // Check if Firebase Admin SDK is running in active credentials mode
      if (firebaseAdmin && typeof firebaseAdmin.messaging === 'function') {
        const messaging = firebaseAdmin.messaging();
        const payload = {
          token: fcmToken,
          notification: { title, body },
          data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK', // standard navigation intent hook
          }
        };

        const response = await messaging.send(payload);
        logger.info(`FCM Notification dispatched successfully. MessageId: ${response}`);
        return true;
      } else {
        // Mock fallback mode (prints a high-visibility dashboard warning)
        this.logMockNotification(fcmToken, title, body, data);
        return true;
      }
    } catch (error: any) {
      logger.error(`FCM sending error: ${error.message}`);
      // Fallback logging on credential errors
      this.logMockNotification(fcmToken, title, body, data);
      return false;
    }
  }

  private logMockNotification(token: string, title: string, body: string, data: any) {
    logger.warn('--- 🔔 FIREBASE PUSH NOTIFICATION SIMULATOR ---');
    logger.warn(`Device Token: ${token.substring(0, 20)}...`);
    logger.warn(`Notification Title: ${title}`);
    logger.warn(`Notification Body: ${body}`);
    logger.warn(`Payload Data: ${JSON.stringify(data)}`);
    logger.warn('------------------------------------------------');
  }

  // 1. Ride Accepted
  public async sendRideAccepted(
    passengerToken: string,
    rideId: string,
    driverName: string,
    plateNumber: string
  ): Promise<boolean> {
    return this.sendPushNotification(
      passengerToken,
      'Ride Accepted 🚕',
      `Your SafeRide Pilot ${driverName} is on the way! Vehicle plate: ${plateNumber}`,
      { rideId, type: 'RIDE_ACCEPTED' }
    );
  }

  // 2. Ride Cancelled
  public async sendRideCancelled(
    targetToken: string,
    rideId: string,
    reason: string
  ): Promise<boolean> {
    return this.sendPushNotification(
      targetToken,
      'Ride Cancelled ⚠️',
      `Your booking was cancelled: ${reason}`,
      { rideId, type: 'RIDE_CANCELLED' }
    );
  }

  // 3. Driver Arrived
  public async sendDriverArrived(
    passengerToken: string,
    rideId: string
  ): Promise<boolean> {
    return this.sendPushNotification(
      passengerToken,
      'Driver Arrived 📍',
      'Your SafeRide Pilot has arrived at your pickup spot. Provide OTP to start journey.',
      { rideId, type: 'DRIVER_ARRIVED' }
    );
  }

  // 4. SOS Alert (to Guardians)
  public async sendSOSAlert(
    guardianToken: string,
    passengerName: string,
    rideId: string,
    shareUrl: string
  ): Promise<boolean> {
    return this.sendPushNotification(
      guardianToken,
      '🚨 URGENT SOS PANIC ALERT',
      `${passengerName} has activated the SOS panic assistance! Click to trace live location details.`,
      { rideId, shareUrl, type: 'SOS_PANIC' }
    );
  }

  // 5. Emergency Alert (to Passenger/Driver from safety deviations checks)
  public async sendEmergencyAlert(
    targetToken: string,
    rideId: string,
    alertMessage: string
  ): Promise<boolean> {
    return this.sendPushNotification(
      targetToken,
      '⚠️ AI Safety Deviation Notice',
      alertMessage,
      { rideId, type: 'SAFETY_DEVIATION' }
    );
  }
}

export const notificationService = new NotificationService();
export default notificationService;
