import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, Modal, Vibration } from 'react-native';
import { Text, Button, Card, useTheme, ActivityIndicator } from 'react-native-paper';
import { useRide } from '../../context/RideContext';

export const ActiveRideScreen: React.FC = () => {
  const theme = useTheme();
  const { activeRide, driverLocation, deviationAlert, isPanicActive, triggerSOS, cancelActiveRide, clearAlert } = useRide();
  const [isSendingSOS, setIsSendingSOS] = useState(false);

  const handlePanicButton = async () => {
    setIsSendingSOS(true);
    // Vibrate device to confirm press
    Vibration.vibrate([0, 500, 100, 500]);
    await triggerSOS();
    setIsSendingSOS(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Visual Tracking Map Simulation */}
      <View style={[styles.mapSection, { backgroundColor: theme.colors.outline }]}>
        <Text style={styles.mapIcon}>🛡️</Text>
        <Text style={styles.mapTitle}>SafeRide AI Active Guard</Text>
        {driverLocation ? (
          <Text style={styles.coordinatesText}>
            Driver Stream Coordinates: [{driverLocation.longitude.toFixed(5)}, {driverLocation.latitude.toFixed(5)}]
          </Text>
        ) : (
          <Text style={styles.coordinatesText}>Awaiting active GPS coordinates stream...</Text>
        )}
        
        {/* Animated radar rings simulation */}
        <View style={styles.radarRing} />
      </View>

      {/* Safety Status Notification Banner */}
      {deviationAlert ? (
        <Card style={[styles.alertBanner, { backgroundColor: theme.colors.error }]} mode="contained">
          <Card.Content style={styles.alertContent}>
            <Text style={styles.alertTitle}>⚠️ Route Deviation Anomaly</Text>
            <Text style={styles.alertText}>{deviationAlert}</Text>
            <Button
              mode="text"
              onPress={clearAlert}
              labelStyle={{ color: '#FFFFFF', fontWeight: 'bold' }}
              style={styles.alertDismiss}
            >
              Acknowledge
            </Button>
          </Card.Content>
        </Card>
      ) : null}

      {/* Main Details Sheet */}
      <ScrollView contentContainerStyle={styles.detailsSheet}>
        {/* OTP Verification Block */}
        {activeRide?.status === 'ACCEPTED' ? (
          <Card style={styles.otpCard} mode="outlined">
            <Card.Content style={styles.otpContent}>
              <Text style={styles.otpHeader}>Verify Ride Start</Text>
              <Text style={styles.otpText}>Provide this OTP code to the driver:</Text>
              <Text style={[styles.otpCode, { color: theme.colors.accent }]}>{activeRide.otpCode}</Text>
            </Card.Content>
          </Card>
        ) : null}

        {/* Driver Profile Specs */}
        {activeRide?.driver ? (
          <Card style={styles.driverCard} mode="outlined">
            <Card.Content>
              <View style={styles.driverHeader}>
                <View style={styles.driverPhotoContainer}>
                  <Text style={styles.driverPhotoIcon}>👨🏻‍✈️</Text>
                </View>
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>Tesla SafeRide Pilot</Text>
                  <Text style={styles.driverVehicle}>
                    {activeRide.driver.vehicle.color} {activeRide.driver.vehicle.make} {activeRide.driver.vehicle.model}
                  </Text>
                  <Text style={[styles.driverPlate, { color: theme.colors.secondary }]}>
                    License Plate: {activeRide.driver.vehicle.plateNumber}
                  </Text>
                </View>
                <Text style={styles.driverRating}>⭐️ {activeRide.driver.rating}</Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {/* Ride Status Tracker */}
        <Card style={styles.statusCard} mode="outlined">
          <Card.Content>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Ride Status:</Text>
              <Text style={[styles.statusValue, { color: activeRide?.status === 'IN_PROGRESS' ? theme.colors.accent : theme.colors.secondary }]}>
                {activeRide?.status}
              </Text>
            </View>
            <Text style={styles.addressLabel}>Pickup:</Text>
            <Text style={styles.addressText}>{activeRide?.pickup.address}</Text>
            <Text style={styles.addressLabel}>Dropoff:</Text>
            <Text style={styles.addressText}>{activeRide?.dropoff.address}</Text>
          </Card.Content>
        </Card>

        {/* Urgent SOS trigger */}
        <Card style={[styles.sosCard, isPanicActive && { borderColor: theme.colors.error, borderWidth: 2 }]} mode="elevated">
          <Card.Content style={styles.sosContent}>
            <Text style={styles.sosTitle}>{isPanicActive ? 'Emergency Mode Activated' : 'Emergency Assistance'}</Text>
            <Text style={styles.sosHelper}>
              {isPanicActive 
                ? 'Police services and emergency contacts have been notified with your live coordinates.'
                : 'Vigorously tap or hold the button below to initiate immediate SOS rescue dispatch.'}
            </Text>

            <Button
              mode="contained"
              onPress={handlePanicButton}
              loading={isSendingSOS}
              disabled={isSendingSOS}
              style={[styles.sosButton, { backgroundColor: theme.colors.error }]}
              labelStyle={styles.sosButtonLabel}
            >
              {isPanicActive ? '🔴 SOS TRIGGERED' : '🚨 ACTIVATE SOS PANIC'}
            </Button>
          </Card.Content>
        </Card>

        {/* Completed End Panel */}
        {activeRide?.status === 'COMPLETED' ? (
          <Button
            mode="contained"
            onPress={cancelActiveRide}
            style={[styles.completeButton, { backgroundColor: theme.colors.accent }]}
            labelStyle={styles.completeButtonLabel}
          >
            Return to Dashboard
          </Button>
        ) : null}
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
    position: 'relative',
    overflow: 'hidden',
  },
  mapIcon: {
    fontSize: 54,
    marginBottom: 10,
    zIndex: 2,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    zIndex: 2,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 6,
    zIndex: 2,
  },
  radarRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  alertBanner: {
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  alertContent: {
    alignItems: 'center',
    padding: 16,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  alertText: {
    fontSize: 13,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  alertDismiss: {
    marginTop: 8,
  },
  detailsSheet: {
    padding: 16,
    paddingBottom: 40,
  },
  otpCard: {
    borderRadius: 12,
    marginBottom: 12,
    borderColor: '#DCFCE7',
    borderWidth: 1,
    backgroundColor: '#F0FDF4',
  },
  otpContent: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  otpHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803D',
  },
  otpText: {
    fontSize: 12,
    color: '#166534',
    marginTop: 4,
  },
  otpCode: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 10,
  },
  driverCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverPhotoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverPhotoIcon: {
    fontSize: 24,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '700',
  },
  driverVehicle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  driverPlate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  driverRating: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusCard: {
    borderRadius: 12,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 8,
  },
  addressText: {
    fontSize: 13,
    color: '#1F2937',
    marginTop: 2,
  },
  sosCard: {
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sosContent: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  sosTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  sosHelper: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  sosButton: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 8,
  },
  sosButtonLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  completeButton: {
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  completeButtonLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
