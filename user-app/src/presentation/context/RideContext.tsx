import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiCall } from '../../data/api';
import { socketClient } from '../../data/socket';

export interface IRide {
  id: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pickup: { address: string; location: { coordinates: number[] } };
  dropoff: { address: string; location: { coordinates: number[] } };
  fare: number;
  otpCode: string;
  driver?: {
    userId: string;
    vehicle: { make: string; model: string; color: string; plateNumber: string };
    rating: number;
  };
}

interface RideContextType {
  activeRide: IRide | null;
  driverLocation: { latitude: number; longitude: number } | null;
  deviationAlert: string | null;
  isPanicActive: boolean;
  rideHistory: any[];
  isLoading: boolean;
  requestRide: (pickupAddr: string, pickupCoords: number[], dropoffAddr: string, dropoffCoords: number[]) => Promise<boolean>;
  triggerSOS: () => Promise<boolean>;
  cancelActiveRide: () => void;
  fetchRideHistory: () => Promise<void>;
  clearAlert: () => void;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRide, setActiveRide] = useState<IRide | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deviationAlert, setDeviationAlert] = useState<string | null>(null);
  const [isPanicActive, setIsPanicActive] = useState<boolean>(false);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync Socket.IO listeners based on ride state transitions
  useEffect(() => {
    if (activeRide) {
      // Connect and register event hooks
      socketClient.connect().then(() => {
        // Track live coordinates updates from driver
        socketClient.on('ride:location_stream', (data: { coordinates: number[] }) => {
          const [lng, lat] = data.coordinates;
          setDriverLocation({ latitude: lat, longitude: lng });
        });

        // Track changes to the ride status (e.g. accepted, started, completed)
        socketClient.on('ride:status_updated', (data: any) => {
          setActiveRide((prev) => {
            if (!prev) return null;
            const updated = { ...prev, status: data.status };
            if (data.driver) {
              updated.driver = data.driver;
            }
            return updated as IRide;
          });

          if (data.status === 'COMPLETED') {
            socketClient.disconnect();
            setDriverLocation(null);
            fetchRideHistory();
          }
        });

        // Track route deviation alert alarms emitted by backend AI checks
        socketClient.on('safety:route_deviation_alert', (data: { message: string }) => {
          setDeviationAlert(data.message);
        });

        // Track SOS active alert broadcasts
        socketClient.on('safety:panic_alert', () => {
          setIsPanicActive(true);
        });
      }).catch((err) => {
        console.warn('Socket activation failed:', err);
      });
    }

    return () => {
      socketClient.disconnect();
    };
  }, [activeRide]);

  const requestRide = async (
    pickupAddr: string,
    pickupCoords: number[], // [lng, lat]
    dropoffAddr: string,
    dropoffCoords: number[] // [lng, lat]
  ): Promise<boolean> => {
    setIsLoading(true);
    setDeviationAlert(null);
    setIsPanicActive(false);

    const res = await apiCall('/rides/request', 'POST', {
      pickup: {
        address: pickupAddr,
        location: { type: 'Point', coordinates: pickupCoords },
      },
      dropoff: {
        address: dropoffAddr,
        location: { type: 'Point', coordinates: dropoffCoords },
      },
    });

    if (res.success && res.ride) {
      setActiveRide({
        id: res.ride._id,
        status: res.ride.status,
        pickup: res.ride.pickup,
        dropoff: res.ride.dropoff,
        fare: res.ride.fare,
        otpCode: res.ride.otpCode,
      });
      setIsLoading(false);
      
      // MOCK DRIVER TELEMETRY SIMULATOR FOR TEST
      // If no driver accepts the ride within 5 seconds, we mock the matching accept
      // This is crucial to demonstrate matching lifecycle flow inside sandboxed environments!
      setTimeout(async () => {
        setActiveRide((prev) => {
          if (prev && prev.status === 'REQUESTED') {
            return {
              ...prev,
              status: 'ACCEPTED',
              driver: {
                userId: 'mock_driver_123',
                vehicle: { make: 'Tesla', model: 'Model 3', color: 'Pearl White', plateNumber: 'SAFE-RIDE' },
                rating: 4.9,
              },
            };
          }
          return prev;
        });
        
        // Start simulated GPS navigation feed from 100m away to dropoff
        let step = 0;
        const interval = setInterval(() => {
          setActiveRide((prev) => {
            if (!prev || prev.status === 'COMPLETED') {
              clearInterval(interval);
              return prev;
            }
            
            // Move driver towards pickup first, then dropoff
            const progress = step / 10;
            const start = prev.pickup.location.coordinates;
            const end = prev.dropoff.location.coordinates;
            const currentLng = start[0] + (end[0] - start[0]) * progress;
            const currentLat = start[1] + (end[1] - start[1]) * progress;
            
            setDriverLocation({ latitude: currentLat, longitude: currentLng });
            
            // Check for mock deviation triggers during testing simulation (step 5)
            if (step === 5) {
              // Simulate a deviation alert event!
              setDeviationAlert('Simulation Warning: Vehicle has deviated 620m from the planned route.');
            }
            
            step++;
            if (step > 10) {
              clearInterval(interval);
            }
            return prev;
          });
        }, 4000);

      }, 5000);

      return true;
    }

    setIsLoading(false);
    return false;
  };

  const triggerSOS = async (): Promise<boolean> => {
    if (!activeRide) return false;
    
    setIsPanicActive(true);
    const res = await apiCall('/rides/panic', 'POST', {
      rideId: activeRide.id,
      details: 'SOS button triggered manually by passenger.',
    });
    
    return res.success;
  };

  const cancelActiveRide = () => {
    setActiveRide(null);
    setDriverLocation(null);
    setDeviationAlert(null);
    setIsPanicActive(false);
  };

  const fetchRideHistory = async () => {
    // In production, hits ride history API endpoint. Here we supply clean mock data.
    setRideHistory([
      { id: '1', date: 'Jul 05, 2026', fare: 18.50, status: 'COMPLETED', safety: 'SAFE', pickup: 'Brooklyn', dropoff: 'Manhattan' },
      { id: '2', date: 'Jul 02, 2026', fare: 12.00, status: 'COMPLETED', safety: 'SAFE', pickup: 'Queens', dropoff: 'Astoria' },
      { id: '3', date: 'Jun 28, 2026', fare: 25.50, status: 'COMPLETED', safety: 'DEVIATION_ALERT', pickup: 'Bronx', dropoff: 'JFK Airport' },
    ]);
  };

  const clearAlert = () => {
    setDeviationAlert(null);
  };

  return (
    <RideContext.Provider
      value={{
        activeRide,
        driverLocation,
        deviationAlert,
        isPanicActive,
        rideHistory,
        isLoading,
        requestRide,
        triggerSOS,
        cancelActiveRide,
        fetchRideHistory,
        clearAlert,
      }}
    >
      {children}
    </RideContext.Provider>
  );
};

export const useRide = () => {
  const context = useContext(RideContext);
  if (!context) throw new Error('useRide must be used inside RideProvider');
  return context;
};
