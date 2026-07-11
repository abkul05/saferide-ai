import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Platform, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Text, TextInput, Button, Card, useTheme, ActivityIndicator, List } from 'react-native-paper';
import { useRide } from '../../context/RideContext';
import * as Location from 'expo-location';
import { getPlacesAutocomplete, getPlaceDetails, PlacePrediction } from '../../../src/data/maps';

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
  const { requestRide, activeRide, isLoading, plannedRoute, calculatePlannedRoute } = useRide();

  const [pickupAddr, setPickupAddr] = useState('My Current Location');
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [destination, setDestination] = useState('');
  const [destinationCoords, setDestinationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [error, setError] = useState('');
  
  const mapRef = useRef<any>(null);

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
        console.warn('Error fetching device GPS location:', err.message);
        // Fallback default coordinates (Times Square)
        setPickupCoords({ latitude: 40.7580, longitude: -73.9855 });
      }
    })();
  }, []);

  // 2. Places Autocomplete search input
  const handleDestinationInput = async (text: string) => {
    setDestination(text);
    if (text.trim().length > 2) {
      const results = await getPlacesAutocomplete(text);
      setPredictions(results);
    } else {
      setPredictions([]);
    }
  };

  // 3. Resolve Place suggestion coordinate details
  const handleSelectPrediction = async (prediction: PlacePrediction) => {
    setDestination(prediction.mainText);
    setPredictions([]);
    
    setIsLoading(true);
    const details = await getPlaceDetails(prediction.placeId);
    setIsLoading(false);

    if (details && pickupCoords) {
      const dest = { latitude: details.latitude, longitude: details.longitude };
      setDestinationCoords(dest);
      setDestination(details.address);

      // Query Google Directions path polylines, distance, and duration metrics
      const route = await calculatePlannedRoute(pickupCoords, dest);
      
      // Auto-fit route in map frame bounds
      if (mapRef.current && route) {
        mapRef.current.fitToCoordinates([pickupCoords, dest], {
          edgePadding: { top: 50, right: 50, bottom: 250, left: 50 },
          animated: true,
        });
      }
    }
  };

  const handleBookRide = async () => {
    setError('');
    
    if (!pickupCoords) {
      setError('Awaiting current GPS coordinates...');
      return;
    }
    
    if (!destinationCoords) {
      setError('Please select a valid destination');
      return;
    }

    try {
      const success = await requestRide(
        pickupAddr,
        [pickupCoords.longitude, pickupCoords.latitude],
        destination,
        [destinationCoords.longitude, destinationCoords.latitude]
      );
      
      if (!success) {
        setError('Failed to book ride. Verify servers.');
      }
    } catch {
      setError('Network communication failed.');
    }
  };

  const renderPredictions = () => {
    if (predictions.length === 0) return null;
    return (
      <Card style={styles.autocompleteCard} mode="contained">
        <FlatList
          data={predictions}
          keyExtractor={(item) => item.placeId}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => handleSelectPrediction(item)}>
              <List.Item
                title={item.mainText}
                description={item.description}
                left={() => <Text style={{ fontSize: 16 } as any}>📍</Text>}
                titleStyle={{ fontSize: 13, fontWeight: '700' }}
                descriptionStyle={{ fontSize: 11 }}
              />
            </TouchableOpacity>
          )}
        />
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      
      {/* Google Map View Board (Native Platform check wrapper) */}
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
          {/* User Marker pin */}
          <Marker
            coordinate={pickupCoords}
            title="Pickup Location"
            description="My Current Location"
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerIcon}>👤</Text>
            </View>
          </Marker>

          {/* Destination Marker pin */}
          {destinationCoords && (
            <Marker
              coordinate={destinationCoords}
              title="Dropoff Location"
              description={destination}
            >
              <View style={[styles.markerContainer, { backgroundColor: '#F87171' }]}>
                <Text style={styles.markerIcon}>🏁</Text>
              </View>
            </Marker>
          )}

          {/* Planned route Polyline overlay path */}
          {plannedRoute && destinationCoords && (
            <Polyline
              coordinates={plannedRoute.coordinates}
              strokeColor={theme.colors.secondary}
              strokeWidth={4}
            />
          )}
        </MapView>
      ) : (
        // Web Platform Visual simulation Fallback Panel
        <View style={[styles.mapPlaceholder, { backgroundColor: theme.colors.outline }]}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.mapText}>SafeRide AI Live Maps View</Text>
          {pickupCoords && (
            <Text style={styles.mapSubtext}>
              User Location Coords: [{pickupCoords.longitude.toFixed(4)}, {pickupCoords.latitude.toFixed(4)}]
            </Text>
          )}
          {plannedRoute && (
            <Card style={styles.routeCard} mode="contained">
              <Card.Content>
                <Text style={styles.routeDetail}>Route Path Calculated</Text>
                <Text style={styles.routeDetailText}>Distance: {plannedRoute.distanceText}</Text>
                <Text style={styles.routeDetailText}>Duration: {plannedRoute.durationText}</Text>
              </Card.Content>
            </Card>
          )}
        </View>
      )}

      {/* Floating autocomplete suggestions */}
      {renderPredictions()}

      {/* Input / Booking Cards sheets */}
      <View style={styles.bookingSheet}>
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text style={styles.title}>Where to?</Text>
            
            <TextInput
              label="Pickup Location"
              value={pickupAddr}
              onChangeText={setPickupAddr}
              mode="flat"
              style={styles.input}
              activeUnderlineColor={theme.colors.primary}
              left={<TextInput.Icon icon={() => <span style={{ fontSize: 16 } as any}>📍</span>} />}
            />

            <TextInput
              label="Destination Address"
              value={destination}
              onChangeText={handleDestinationInput}
              mode="flat"
              style={styles.input}
              activeUnderlineColor={theme.colors.primary}
              left={<TextInput.Icon icon={() => <span style={{ fontSize: 16 } as any}>🏁</span>} />}
            />

            {plannedRoute && (
              <View style={styles.etaRow}>
                <View style={styles.etaCol}>
                  <Text style={styles.etaLabel}>Distance</Text>
                  <Text style={styles.etaVal}>{plannedRoute.distanceText}</Text>
                </View>
                <View style={styles.etaCol}>
                  <Text style={styles.etaLabel}>ETA</Text>
                  <Text style={styles.etaVal}>{plannedRoute.durationText}</Text>
                </View>
              </View>
            )}

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
  },
  markerIcon: {
    fontSize: 14,
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
  },
  routeCard: {
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  routeDetail: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  routeDetailText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  autocompleteCard: {
    position: 'absolute',
    top: 220,
    left: 16,
    right: 16,
    zIndex: 100,
    maxHeight: 180,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  bookingSheet: {
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
  etaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F3F4F6',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  etaCol: {
    alignItems: 'center',
  },
  etaLabel: {
    fontSize: 10,
    color: '#8E8E93',
    fontWeight: '600',
  },
  etaVal: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
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
