import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiCall } from '../data/api';

// Enforce standard foreground notifications displaying behaviors
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests device push permissions and retrieves the client FCM/Expo token
 */
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  let token: string | null = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted yet
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to obtain push notifications permissions.');
      return null;
    }

    // Expo push token resolves uniquely per application build
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
    console.log('FCM Device Push Token registered:', token);

    // Save token to backend profile if active JWT exists
    await registerTokenWithBackend(token);

  } catch (error) {
    console.warn('Error fetching device push token:', error);
  }

  // OS-specific configuration parameters
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  return token;
};

/**
 * Sends token registry post payload to servers
 */
export const registerTokenWithBackend = async (fcmToken: string): Promise<boolean> => {
  try {
    const res = await apiCall('/users/fcm-token', 'POST', { fcmToken });
    return res.success;
  } catch (err) {
    console.warn('FCM token registry sync failed. Retrying on next session update.');
    return false;
  }
};

/**
 * Configures event listeners tracking taps and logs
 */
export const initPushNotificationListeners = () => {
  // Foreground listener
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Foreground push notification received:', notification.request.content.title);
  });

  // Tapped notification listener
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Push notification tapped by user. Action payload data:', data);
    // Add navigation routing triggers here (e.g. redirecting to active ride map or deviation alert logs)
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};
