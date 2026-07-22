import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useRide } from '../context/RideContext';
import { AuthNavigator } from './AuthNavigator';
import { HomeNavigator } from './HomeNavigator';
import { NavigationScreen } from '../screens/ride/NavigationScreen';
import { VerificationScreen } from '../screens/auth/VerificationScreen';
import { ActivityIndicator, View } from 'react-native';

export type AppStackParamList = {
  Auth: undefined;
  Home: undefined;
  ActiveRideNavigation: undefined;
  Verification: undefined;
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

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !user?.isProfileComplete ? (
        <Stack.Screen name="Verification" component={VerificationScreen} />
      ) : activeRide ? (
        // If driver has accepted a ride, lock them in the Active Navigation screen to route safely!
        <Stack.Screen name="ActiveRideNavigation" component={NavigationScreen} />
      ) : (
        <Stack.Screen name="Home" component={HomeNavigator} />
      )}
    </Stack.Navigator>
  );
};
