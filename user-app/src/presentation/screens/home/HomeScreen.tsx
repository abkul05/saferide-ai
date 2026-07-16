import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Platform, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, ActivityIndicator, List } from 'react-native-paper';
import { useRide } from '../../context/RideContext';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';

// Conditionally import react-native-maps to avoid crashes on web
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Polyline = Maps.Polyline;
}

const { width, height } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { 
    activeRide, 
    isLoading, 
    plannedRoute, 
    calculatePlannedRoute,
    estimateRideFares,
    requestSelectedRide,
    triggerSOS
  } = useRide();

  const [pickupAddr, setPickupAddr] = useState('My Current Location');
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [error, setError] = useState('');
  const mapRef = useRef<any>(null);

  // Booking details state
  const [estimates, setEstimates] = useState<any[]>([]);
  const [selectedRide, setSelectedRide] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [selectedPayment, setSelectedPayment] = useState<'CARD' | 'WALLET' | 'CASH'>('CASH');
  const [isConfirmationMode, setIsConfirmationMode] = useState(false);
  const [isBookingRequested, setIsBookingRequested] = useState(false);

  // 1. Fetch Current Location using Expo Location API
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const coords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        };
        setPickupCoords(coords);
        
        // Center map region
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            ...coords,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015
          }, 1000);
        }
      } catch (err: any) {
        console.warn('Error fetching GPS location:', err.message);
        // Fallback default coordinates (Times Square)
        setPickupCoords({ latitude: 40.7580, longitude: -73.9855 });
      }
    })();
  }, []);

  // 2. Watch routing params passed back from SearchScreen
  useEffect(() => {
    if (route.params?.dropoff && pickupCoords) {
      const { address, latitude, longitude } = route.params.dropoff;
      setDestination(address);
      const destCoords = { latitude, longitude };
      setDestinationCoords(destCoords);
      setIsConfirmationMode(false);
      
      handleRouteAndEstimates(pickupCoords, destCoords);
    }
  }, [route.params?.dropoff, pickupCoords]);

  const handleRouteAndEstimates = async (
    pickup: { latitude: number; longitude: number },
    dest: { latitude: number; longitude: number }
  ) => {
    setError('');
    try {
      // Directions API Polyline
      const routeData = await calculatePlannedRoute(pickup, dest);
      
      // Price estimations
      const response = await estimateRideFares(
        [pickup.longitude, pickup.latitude],
        [dest.longitude, dest.latitude]
      );

      if (response.success && response.estimates) {
        setEstimates(response.estimates);
        setDistance(response.distance || 0);
        setSelectedRide(response.estimates[3]); // default: Sedan
      } else {
        setError('Failed to calculate estimates parameters. Try again.');
      }

      // Camera Animation
      if (mapRef.current && routeData) {
        mapRef.current.fitToCoordinates([pickup, dest], {
          edgePadding: { top: 50, right: 50, bottom: 350, left: 50 },
          animated: true,
        });
      }
    } catch {
      setError('Connection to mapping api failed.');
    }
  };

  const handleBookRide = async () => {
    setError('');
    if (!pickupCoords || !destinationCoords || !selectedRide) {
      setError('Please resolve destinations and select a vehicle type.');
      return;
    }

    setIsBookingRequested(true);
    try {
      const success = await requestSelectedRide(
        { address: pickupAddr, location: { type: 'Point', coordinates: [pickupCoords.longitude, pickupCoords.latitude] } },
        { address: destination, location: { type: 'Point', coordinates: [destinationCoords.longitude, destinationCoords.latitude] } },
        selectedRide.rideType,
        selectedRide.fare,
        selectedPayment,
        distance
      );

      if (!success) {
        setError('Booking request rejected by servers.');
        setIsBookingRequested(false);
      }
    } catch {
      setError('API connection failed.');
      setIsBookingRequested(false);
    }
  };

  const handleSOS = async () => {
    try {
      await triggerSOS();
      alert('🚨 EMERGENCY ALERT ACTIVATED: Coordinates broadcast to emergency network.');
    } catch (err) {
      console.warn(err);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#0B0C0E' }]}>
      
      {/* Map Board */}
      {Platform.OS !== 'web' && MapView && pickupCoords ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: pickupCoords.latitude,
            longitude: pickupCoords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015
          }}
          userInterfaceStyle="dark"
        >
          {/* Pickup Pin */}
          <Marker coordinate={pickupCoords} title="Pickup Location">
            <View style={styles.markerContainer}>
              <Text style={styles.markerIcon}>👤</Text>
            </View>
          </Marker>

          {/* Destination Pin */}
          {destinationCoords && (
            <Marker coordinate={destinationCoords} title="Destination">
              <View style={[styles.markerContainer, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.markerIcon}>🏁</Text>
              </View>
            </Marker>
          )}

          {/* Route Line */}
          {plannedRoute && destinationCoords && (
            <Polyline
              coordinates={plannedRoute.coordinates}
              strokeColor={theme.colors.primary}
              strokeWidth={5}
            />
          )}
        </MapView>
      ) : (
        /* Web Placeholder */
        <View style={styles.mapPlaceholder}>
          <Text style={styles.placeholderIcon}>🗺️</Text>
          <Text style={styles.placeholderText}>SafeRide Live Coordinates System</Text>
        </View>
      )}

      {/* Floating SOS button */}
      <TouchableOpacity style={[styles.sosButton, { backgroundColor: '#EF4444' }]} onPress={handleSOS}>
        <Text style={styles.sosButtonText}>🚨 SOS</Text>
      </TouchableOpacity>

      {/* Booking Sheets (Dynamic Bottom Sheets simulated via overlay Cards) */}
      <View style={styles.bottomSheetContainer}>
        {!destinationCoords ? (
          /* Step 1: Destination Selection Search Trigger Card */
          <Card style={[styles.card, { backgroundColor: '#111827', borderColor: '#1F2937' }]} mode="outlined">
            <Card.Content>
              <Text style={styles.sheetTitle}>Let's Ride safely</Text>
              
              <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                <TextInput
                  label="Search Destination..."
                  value={destination}
                  editable={false}
                  mode="outlined"
                  style={styles.searchButtonInput}
                  left={<TextInput.Icon icon="magnify" />}
                />
              </TouchableOpacity>

              <Text style={styles.favoritesTitle}>Favorite Places</Text>
              <View style={styles.favoritesRow}>
                <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                  <View style={styles.favoriteItem}>
                    <Text style={styles.favoriteIcon}>🏠</Text>
                    <Text style={styles.favoriteLabel}>Home</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                  <View style={styles.favoriteItem}>
                    <Text style={styles.favoriteIcon}>💼</Text>
                    <Text style={styles.favoriteLabel}>Work</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        ) : !isConfirmationMode ? (
          /* Step 2: Ride Estimations Selection Sheet */
          <Card style={[styles.card, { backgroundColor: '#111827', borderColor: '#1F2937' }]} mode="outlined">
            <Card.Content>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Select Ride Type</Text>
                <TouchableOpacity onPress={() => setDestinationCoords(null)}>
                  <Text style={{ color: theme.colors.error, fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={estimates}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.rideType}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => setSelectedRide(item)}>
                    <Card 
                      style={[
                        styles.rideCard, 
                        { 
                          borderColor: selectedRide?.rideType === item.rideType ? theme.colors.primary : '#374151',
                          backgroundColor: selectedRide?.rideType === item.rideType ? '#1F2937' : '#111827'
                        }
                      ]} 
                      mode="outlined"
                    >
                      <Card.Content style={styles.rideCardContent}>
                        <Text style={styles.rideImage}>{item.image}</Text>
                        <Text style={styles.rideTypeTitle}>{item.rideType}</Text>
                        <Text style={styles.rideETA}>{item.eta} min • ⭐{item.rating}</Text>
                        <Text style={[styles.rideFare, { color: theme.colors.primary }]}>${item.fare.toFixed(2)}</Text>
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                )}
                style={styles.estimatesList}
              />

              <Button
                mode="contained"
                onPress={() => setIsConfirmationMode(true)}
                style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
              >
                Book Selected Ride
              </Button>
            </Card.Content>
          </Card>
        ) : (
          /* Step 3: Confirmation Summary Sheet */
          <Card style={[styles.card, { backgroundColor: '#111827', borderColor: '#1F2937' }]} mode="outlined">
            <Card.Content>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Confirm Your Journey</Text>
                <TouchableOpacity onPress={() => setIsConfirmationMode(false)}>
                  <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>Back</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Pickup:</Text>
                <Text style={styles.confirmValue} numberOfLines={1}>{pickupAddr}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Dropoff:</Text>
                <Text style={styles.confirmValue} numberOfLines={1}>{destination}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Selected Ride:</Text>
                <Text style={styles.confirmValue}>{selectedRide?.name} ({selectedRide?.rideType})</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>Total Fare:</Text>
                <Text style={[styles.confirmValue, { color: theme.colors.primary, fontWeight: 'bold' }]}>
                  ${selectedRide?.fare.toFixed(2)}
                </Text>
              </View>

              <Text style={styles.paymentTitle}>Payment Method</Text>
              <View style={styles.paymentMethodsRow}>
                {['CARD', 'WALLET', 'CASH'].map((method: any) => (
                  <Button
                    key={method}
                    mode={selectedPayment === method ? 'contained' : 'outlined'}
                    onPress={() => setSelectedPayment(method)}
                    style={styles.paymentBtn}
                    labelStyle={{ fontSize: 11 }}
                  >
                    {method}
                  </Button>
                ))}
              </View>

              {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

              {isBookingRequested ? (
                <View style={styles.searchingDriverBox}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.searchingDriverText}>Finding your nearest SafeRide Pilot...</Text>
                </View>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleBookRide}
                  loading={isLoading}
                  disabled={isLoading}
                  style={[styles.confirmBtn, { backgroundColor: theme.colors.primary, marginTop: 16 }]}
                >
                  Confirm & Request Ride
                </Button>
              )}
            </Card.Content>
          </Card>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  markerContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    elevation: 4,
  },
  markerIcon: {
    fontSize: 14,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#0F0F14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 84,
    marginBottom: 12,
  },
  placeholderText: {
    color: '#8F9092',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sosButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 36,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 6,
    zIndex: 100,
  },
  sosButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    zIndex: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 16,
  },
  searchButtonInput: {
    backgroundColor: '#1F2937',
    marginBottom: 16,
  },
  favoritesTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  favoritesRow: {
    flexDirection: 'row',
  },
  favoriteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginRight: 10,
  },
  favoriteIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  favoriteLabel: {
    color: '#E5E7EB',
    fontSize: 13,
    fontWeight: '600',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  estimatesList: {
    marginBottom: 16,
  },
  rideCard: {
    width: 110,
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rideCardContent: {
    alignItems: 'center',
    padding: 8,
  },
  rideImage: {
    fontSize: 32,
    marginBottom: 4,
  },
  rideTypeTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rideETA: {
    color: '#8E8E93',
    fontSize: 10,
    marginTop: 2,
  },
  rideFare: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
  },
  confirmBtn: {
    paddingVertical: 6,
    borderRadius: 8,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  confirmLabel: {
    color: '#8E8E93',
    fontSize: 13,
  },
  confirmValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: width * 0.6,
  },
  paymentTitle: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentBtn: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
  },
  searchingDriverBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderColor: 'rgba(16,185,129,0.2)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
  },
  searchingDriverText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 10,
  },
});
