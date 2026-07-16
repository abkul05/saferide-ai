import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/presentation/context/AuthContext';
import { RideProvider } from './src/presentation/context/RideContext';
import { AppNavigator } from './src/presentation/navigation/AppNavigator';
import { DarkTheme } from './src/core/theme';
import { registerForPushNotificationsAsync, initPushNotificationListeners } from './src/services/notificationService';

export default function App() {
  useEffect(() => {
    // Request push notification permissions & retrieve token
    registerForPushNotificationsAsync();

    // Start background & foreground push handlers listeners
    const cleanUpListeners = initPushNotificationListeners();

    return () => cleanUpListeners();
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={DarkTheme}>
        <NavigationContainer>
          <AuthProvider>
            <RideProvider>
              <AppNavigator />
              <StatusBar style="light" />
            </RideProvider>
          </AuthProvider>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
