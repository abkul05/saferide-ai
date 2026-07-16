import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, Card, useTheme } from 'react-native-paper';
import { useRide } from '../../context/RideContext';

export const NavigationScreen: React.FC = () => {
  const theme = useTheme();
  const { activeRide, startRide, completeRide, updateLocation } = useRide();

  const [otpInput, setOtpInput] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [arrived, setArrived] = useState(false);

  // Simulated GPS Telemetry Emitter (Streams updates to backend during transit)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (activeRide && activeRide.status === 'IN_PROGRESS') {
      let step = 0;
      const start = activeRide.pickup.location.coordinates;
      const end = activeRide.dropoff.location.coordinates;

      interval = setInterval(() => {
        // Linearly interpolate coordinates from pickup to dropoff
        const progress = step / 10;
        const currentLng = start[0] + (end[0] - start[0]) * progress;
        const currentLat = start[1] + (end[1] - start[1]) * progress;

        updateLocation(currentLat, currentLng);
        
        step++;
        if (step > 10) {
          clearInterval(interval);
        }
      }, 4000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeRide?.status]);

  const handleStartRide = async () => {
    setError('');
    
    if (otpInput.length !== 4) {
      setError('Please enter the 4-digit OTP provided by passenger');
      return;
    }

    setIsLoading(true);
    try {
      const success = await startRide(otpInput.trim());
      if (!success) {
        setError('Invalid OTP code. Verify credentials with passenger.');
      }
    } catch {
      setError('Network communication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteRide = async () => {
    setIsLoading(true);
    try {
      const success = await completeRide();
      if (success) {
        Alert.alert('Success', 'Ride booking completed successfully!');
      }
    } catch {
      Alert.alert('Error', 'Failed to complete ride.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Visual Directions Simulation Card */}
      <View style={[styles.mapSection, { backgroundColor: theme.colors.outline }]}>
        <Text style={styles.mapIcon}>🏁</Text>
        <Text style={styles.mapTitle}>SafeRide Navigation Board</Text>
        
        {activeRide?.status === 'IN_PROGRESS' ? (
          <Text style={styles.navInstruction}>
            Route: En route to Destination Address. GPS Stream Active.
          </Text>
        ) : arrived ? (
          <Text style={styles.navInstruction}>
            Status: Arrived at Pickup Point. Awaiting passenger boarding.
          </Text>
        ) : (
          <Text style={styles.navInstruction}>
            Route: Drive to Pickup Point: {activeRide?.pickup.address}
          </Text>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.detailsSheet}>
        {/* Navigation actions based on active ride lifecycle */}
        {activeRide?.status === 'ACCEPTED' && !arrived ? (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.cardCenter}>
              <Text style={styles.phaseTitle}>Pickup Sequence</Text>
              <Text style={styles.helperText}>Drive safely to the passenger's pickup location</Text>
              
              <Button
                mode="contained"
                onPress={() => setArrived(true)}
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              >
                Mark Arrived at Pickup
              </Button>
            </Card.Content>
          </Card>
        ) : activeRide?.status === 'ACCEPTED' && arrived ? (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
              <Text style={styles.phaseTitle}>Verify Boarding OTP</Text>
              <Text style={styles.helperText}>Request the 4-digit code shown on passenger's SafeRide app</Text>

              <TextInput
                label="Enter 4-Digit OTP"
                value={otpInput}
                onChangeText={setOtpInput}
                keyboardType="number-pad"
                maxLength={4}
                mode="outlined"
                style={styles.input}
                activeOutlineColor={theme.colors.primary}
                error={!!error}
              />

              {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

              <Button
                mode="contained"
                onPress={handleStartRide}
                loading={isLoading}
                disabled={isLoading}
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              >
                Verify & Start Journey
              </Button>
            </Card.Content>
          </Card>
        ) : activeRide?.status === 'IN_PROGRESS' ? (
          <Card style={styles.card} mode="outlined">
            <Card.Content style={styles.cardCenter}>
              <Text style={styles.phaseTitle}>Transit Active</Text>
              <Text style={styles.helperText}>SafeRide AI is actively auditing the coordinates route</Text>
              
              <Button
                mode="contained"
                onPress={handleCompleteRide}
                loading={isLoading}
                disabled={isLoading}
                style={[styles.actionBtn, { backgroundColor: theme.colors.primary }]}
              >
                Complete Ride Booking
              </Button>
            </Card.Content>
          </Card>
        ) : null}

        {/* Addresses Log Details */}
        <Card style={[styles.card, { marginTop: 12 }]} mode="outlined">
          <Card.Content>
            <Text style={styles.detailsHeader}>Booking Specs</Text>
            <Text style={styles.label}>Passenger ID:</Text>
            <Text style={styles.text}>Verified SafeRide User</Text>
            <Text style={styles.label}>Pickup Address:</Text>
            <Text style={styles.text}>{activeRide?.pickup.address}</Text>
            <Text style={styles.label}>Destination Address:</Text>
            <Text style={styles.text}>{activeRide?.dropoff.address}</Text>
            <Text style={styles.label}>Total Fare:</Text>
            <Text style={styles.fare}>${activeRide?.fare.toFixed(2)}</Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapSection: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  mapIcon: {
    fontSize: 54,
    marginBottom: 10,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  navInstruction: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  detailsSheet: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 12,
  },
  cardCenter: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  phaseTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  helperText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
    marginBottom: 16,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 6,
    borderRadius: 8,
  },
  input: {
    marginBottom: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 4,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    marginLeft: 4,
  },
  detailsHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 8,
  },
  text: {
    fontSize: 13,
    color: '#1F2937',
    marginTop: 2,
  },
  fare: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
    marginTop: 4,
  },
});
