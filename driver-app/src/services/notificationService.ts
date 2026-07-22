import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiCall } from '../data/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  console.log('Push notifications disabled in local development mode.');
  return null;
};

export const registerTokenWithBackend = async (fcmToken: string): Promise<boolean> => {
  return true;
};

export const initPushNotificationListeners = () => {
  return () => {};
};
