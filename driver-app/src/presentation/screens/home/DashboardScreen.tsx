import React from 'react';
import { StyleSheet, View, Dimensions, Platform } from 'react-native';
import { Text, Button, Card, useTheme, Switch } from 'react-native-paper';
import { useRide } from '../../context/RideContext';

export const DashboardScreen: React.FC = () => {
  const theme = useTheme();
  const { isOnline, toggleOnline, incomingRequest, acceptRequest, rejectRequest } = useRide();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Dynamic Map Board */}
      <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.outline }]}>
        <Text style={styles.mapIcon}>{isOnline ? '📡' : '💤'}</Text>
        <Text style={styles.mapText}>
          {isOnline ? 'Searching for Passenger Requests...' : 'Go Online to Start Receiving Rides'}
        </Text>
        {isOnline ? (
          <View style={styles.pulsingRadar} />
        ) : null}
      </View>

      {/* Online/Offline overlay card */}
      <View style={styles.controlSheet}>
        <Card style={styles.controlCard} mode="elevated">
          <Card.Content style={styles.controlContent}>
            <View style={styles.statusRow}>
              <View>
                <Text style={styles.statusTitle}>{isOnline ? 'Online & Available' : 'Offline'}</Text>
                <Text style={styles.statusSubtitle}>
                  {isOnline ? 'Live GPS streaming active' : 'Location updates paused'}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={toggleOnline}
                color={theme.colors.accent}
              />
            </View>
          </Card.Content>
        </Card>
      </View>

      {/* Incoming Request Alert bottom sheet overlay */}
      {incomingRequest ? (
        <View style={styles.alertSheet}>
          <Card style={[styles.alertCard, { borderColor: theme.colors.accent, borderWidth: 1 }]} mode="elevated">
            <Card.Content>
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>⚡ New Booking Request</Text>
                <Text style={[styles.alertFare, { color: theme.colors.accent }]}>
                  ${incomingRequest.fare.toFixed(2)}
                </Text>
              </View>

              <Text style={styles.routeLabel}>Pickup Location:</Text>
              <Text style={styles.routeText}>{incomingRequest.pickup.address}</Text>

              <Text style={styles.routeLabel}>Dropoff Address:</Text>
              <Text style={styles.routeText}>{incomingRequest.dropoff.address}</Text>

              <View style={styles.buttonGroup}>
                <Button
                  mode="outlined"
                  onPress={rejectRequest}
                  style={styles.declineBtn}
                  labelStyle={{ color: theme.colors.error }}
                >
                  Decline
                </Button>
                <Button
                  mode="contained"
                  onPress={acceptRequest}
                  style={[styles.acceptBtn, { backgroundColor: theme.colors.accent }]}
                >
                  Accept & Navigate
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      ) : null}
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
    position: 'relative',
  },
  mapIcon: {
    fontSize: 84,
    marginBottom: 16,
    zIndex: 2,
  },
  mapText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8E8E93',
    textAlign: 'center',
    zIndex: 2,
  },
  pulsingRadar: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 2,
    borderColor: 'rgba(52, 211, 153, 0.15)',
  },
  controlSheet: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  controlCard: {
    borderRadius: 12,
  },
  controlContent: {
    paddingVertical: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  alertSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    zIndex: 20,
  },
  alertCard: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  alertFare: {
    fontSize: 22,
    fontWeight: '900',
  },
  routeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 8,
  },
  routeText: {
    fontSize: 14,
    color: '#1F2937',
    marginTop: 2,
  },
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#EF4444',
  },
  acceptBtn: {
    flex: 2,
    borderRadius: 8,
  },
});
