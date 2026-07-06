import React, { useState } from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRide } from '../../context/RideContext';

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const { requestRide, activeRide, isLoading } = useRide();

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [error, setError] = useState('');

  const handleBookRide = async () => {
    setError('');
    
    if (!pickup.trim()) {
      setError('Please specify a pickup location');
      return;
    }
    
    if (!dropoff.trim()) {
      setError('Please specify a destination');
      return;
    }

    // Mock coordinates generation based on name length (ensures distinct values for path simulation)
    const mockPickupCoords = [
      -73.935242 + (pickup.length % 5) * 0.01,
      40.73061 + (pickup.length % 3) * 0.01
    ];
    const mockDropoffCoords = [
      -74.006015 - (dropoff.length % 5) * 0.01,
      40.712728 - (dropoff.length % 3) * 0.01
    ];

    try {
      const success = await requestRide(
        pickup.trim(),
        mockPickupCoords,
        dropoff.trim(),
        mockDropoffCoords
      );
      
      if (!success) {
        setError('Failed to book ride. Please verify servers.');
      }
    } catch {
      setError('Network communication failed.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* 
        Simulated Map Board / Interface:
        Uses an aesthetically styled panel for web & simulator environments where react-native-maps crashes,
        while maintaining standard mapping parameters placeholder code.
      */}
      <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.outline }]}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapText}>SafeRide AI Live Tracking Interface</Text>
        <Text style={styles.mapSubtext}>
          {pickup && dropoff 
            ? `Route planned: ${pickup} ➔ ${dropoff}` 
            : 'Enter destinations below to calculate safety parameters'}
        </Text>
      </View>

      {/* Booking card overlay */}
      <View style={styles.bookingSheet}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.title}>Where to?</Text>
            
            <TextInput
              label="Pickup Location"
              value={pickup}
              onChangeText={setPickup}
              mode="flat"
              style={styles.input}
              activeUnderlineColor={theme.colors.primary}
              left={<TextInput.Icon icon={() => <span style={{ fontSize: 16 } as any}>📍</span>} />}
            />

            <TextInput
              label="Destination Address"
              value={dropoff}
              onChangeText={setDropoff}
              mode="flat"
              style={styles.input}
              activeUnderlineColor={theme.colors.primary}
              left={<TextInput.Icon icon={() => <span style={{ fontSize: 16 } as any}>🏁</span>} />}
            />

            {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

            {activeRide?.status === 'REQUESTED' ? (
              <View style={styles.matchingState}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.matchingText}>Broadcasting request to nearby available drivers...</Text>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={handleBookRide}
                loading={isLoading}
                disabled={isLoading}
                style={[styles.button, { backgroundColor: theme.colors.primary }]}
                labelStyle={styles.buttonLabel}
              >
                Confirm SafeRide Booking
              </Button>
            )}
          </Card.Content>
        </Card>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mapIcon: {
    fontSize: 84,
    marginBottom: 16,
  },
  mapText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8E8E93',
  },
  mapSubtext: {
    fontSize: 12,
    color: '#AEAEB2',
    marginTop: 8,
    textAlign: 'center',
  },
  bookingSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
  },
  card: {
    borderRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'transparent',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginBottom: 12,
    marginLeft: 4,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  matchingState: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderColor: '#DCFCE7',
    borderWidth: 1,
  },
  matchingText: {
    flex: 1,
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
    marginLeft: 10,
  },
});
