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
  let token: string | null = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Failed to obtain push notifications permissions.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
    console.log('Driver FCM Device Push Token registered:', token);

    await registerTokenWithBackend(token);

  } catch (error) {
    console.warn('Error fetching driver push token:', error);
  }

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

export const registerTokenWithBackend = async (fcmToken: string): Promise<boolean> => {
  try {
    const res = await apiCall('/users/fcm-token', 'POST', { fcmToken });
    return res.success;
  } catch (err) {
    console.warn('FCM token registry sync failed on driver side.');
    return false;
  }
};

export const initPushNotificationListeners = () => {
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Driver App foreground push notification received:', notification.request.content.title);
  });

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Driver App push notification tapped. Action payload data:', data);
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
};
