import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { AuthNavigator } from './AuthNavigator';
import { HomeNavigator } from './HomeNavigator';
import { ActiveRideScreen } from '../screens/ride/ActiveRideScreen';
import { ActivityIndicator, View } from 'react-native';

export type AppStackParamList = {
  Auth: undefined;
  Home: undefined;
  ActiveRide: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export const AppNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { activeRide } = useRide();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0C0E' }}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // Routing Guard state controller
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !user?.isProfileComplete ? (
        // Redirect incomplete registrations to Profile Setup directly
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : activeRide ? (
        // If an active ride exists, lock passenger to the Tracking screen to ensure safety!
        <Stack.Screen name="ActiveRide" component={ActiveRideScreen} />
      ) : (
        <Stack.Screen name="Home" component={HomeNavigator} />
      )}
    </Stack.Navigator>
  );
};
