import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';

export const SplashScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Animation value
  const scaleAnim = new Animated.Value(0.3);
  const opacityAnim = new Animated.Value(0);

  useEffect(() => {
    // Run scale and opacity animations in parallel
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Setup redirect timeout
    const checkNavigationRoute = setTimeout(async () => {
      if (isLoading) return; // Wait until AuthContext finishes checking token

      if (isAuthenticated) {
        // AppNavigator handles switching routes if logged in,
        // but if we are inside the Auth stack, we might need manual routing.
        return;
      }

      try {
        const onboardingCompleted = await AsyncStorage.getItem('@onboarding_completed');
        if (onboardingCompleted === 'true') {
          navigation.replace('Login');
        } else {
          navigation.replace('Onboarding');
        }
      } catch {
        navigation.replace('Onboarding');
      }
    }, 2500);

    return () => clearTimeout(checkNavigationRoute);
  }, [isLoading, isAuthenticated]);

  return (
    <View style={[styles.container, { backgroundColor: '#0B0C0E' }]}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>
        <Text style={styles.logoIcon}>🛡️</Text>
        <Text style={[styles.brandText, { color: theme.colors.primary }]}>SafeRide AI</Text>
        <Text style={styles.tagline}>Intelligent Safety-Guided Rides</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIcon: {
    fontSize: 84,
    marginBottom: 16,
  },
  brandText: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 14,
    color: '#8F9092',
    marginTop: 8,
    fontWeight: '500',
  },
});
