import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiCall } from '../../data/api';
import { socketClient } from '../../data/socket';
import { getDirections, RouteInfo } from '../../data/maps';

export interface IRide {
  id: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pickup: { address: string; location: { coordinates: number[] } };
  dropoff: { address: string; location: { coordinates: number[] } };
  fare: number;
  otpCode: string;
  plannedRouteGeometry?: string;
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
  plannedRoute: RouteInfo | null;
  calculatePlannedRoute: (pickupCoords: { latitude: number; longitude: number }, dropoffCoords: { latitude: number; longitude: number }) => Promise<RouteInfo | null>;
  requestRide: (pickupAddr: string, pickupCoords: number[], dropoffAddr: string, dropoffCoords: number[]) => Promise<boolean>;
  triggerSOS: () => Promise<boolean>;
  cancelActiveRide: () => void;
  fetchRideHistory: () => Promise<void>;
  clearAlert: () => void;
  processPayment: (rideId: string, paymentMethod: string, amount: number) => Promise<boolean>;
  submitReview: (rideId: string, rating: number, comments: string) => Promise<boolean>;
  createRazorpayOrder: (rideId: string, amount: number) => Promise<{ success: boolean; orderId?: string; keyId?: string; amount?: number }>;
  verifyRazorpayPayment: (rideId: string, razorpayPaymentId: string, razorpayOrderId: string, razorpaySignature: string) => Promise<boolean>;
  fetchInvoiceHTML: (paymentId: string) => Promise<string | null>;
  requestRefund: (paymentId: string, amount?: number) => Promise<boolean>;
  searchPlacesList: (q: string) => Promise<any[]>;
  estimateRideFares: (pickupCoords: number[], dropoffCoords: number[]) => Promise<{ success: boolean; estimates?: any[]; distance?: number }>;
  requestSelectedRide: (pickup: any, dropoff: any, rideType: string, fare: number, paymentMethod: string, distance: number) => Promise<boolean>;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRide, setActiveRide] = useState<IRide | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deviationAlert, setDeviationAlert] = useState<string | null>(null);
  const [isPanicActive, setIsPanicActive] = useState<boolean>(false);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  
  // Stores currently queried routing path details
  const [plannedRoute, setPlannedRoute] = useState<RouteInfo | null>(null);

  // Sync Socket.IO listeners based on ride state transitions
  useEffect(() => {
    if (activeRide) {
      socketClient.connect().then(() => {
        socketClient.on('ride:location_stream', (data: { coordinates: number[] }) => {
          const [lng, lat] = data.coordinates;
          setDriverLocation({ latitude: lat, longitude: lng });
        });

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
            setPlannedRoute(null);
            fetchRideHistory();
          }
        });

        socketClient.on('safety:route_deviation_alert', (data: { message: string }) => {
          setDeviationAlert(data.message);
        });

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

  /**
   * Queries Google Directions API and populates path polyline state
   */
  const calculatePlannedRoute = async (
    pickupCoords: { latitude: number; longitude: number },
    dropoffCoords: { latitude: number; longitude: number }
  ): Promise<RouteInfo | null> => {
    setIsLoading(true);
    try {
      const route = await getDirections(pickupCoords, dropoffCoords);
      setPlannedRoute(route);
      setIsLoading(false);
      return route;
    } catch (error) {
      console.error("Error calculating planned route:", error);
      setIsLoading(false);
      return null;
    }
  };

  const requestRide = async (
    pickupAddr: string,
    pickupCoords: number[], // [lng, lat]
    dropoffAddr: string,
    dropoffCoords: number[] // [lng, lat]
  ): Promise<boolean> => {
    setIsLoading(true);
    setDeviationAlert(null);
    setIsPanicActive(false);

    // Transform planned route coordinates to backend GeoJSON schema: [[longitude, latitude], ...]
    const backendCoords = plannedRoute 
      ? plannedRoute.coordinates.map(c => [c.longitude, c.latitude])
      : [];

    const res = await apiCall('/rides/request', 'POST', {
      pickup: {
        address: pickupAddr,
        location: { type: 'Point', coordinates: pickupCoords },
      },
      dropoff: {
        address: dropoffAddr,
        location: { type: 'Point', coordinates: dropoffCoords },
      },
      plannedRouteGeometry: plannedRoute?.encodedPolyline,
      plannedRouteCoordinates: backendCoords
    });

    if (res.success && res.ride) {
      setActiveRide({
        id: res.ride._id,
        status: res.ride.status,
        pickup: res.ride.pickup,
        dropoff: res.ride.dropoff,
        fare: res.ride.fare,
        otpCode: res.ride.otpCode,
        plannedRouteGeometry: res.ride.plannedRouteGeometry
      });
      setIsLoading(false);
      
      // MOCK DRIVER TELEMETRY SIMULATOR FOR TEST
      // Triggers mock match acceptance if no live driver matches
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
        
        // Start simulated GPS navigation feed along our decoded planned route coords!
        if (plannedRoute && plannedRoute.coordinates.length > 0) {
          let step = 0;
          const routePoints = plannedRoute.coordinates;
          const interval = setInterval(() => {
            setActiveRide((prev) => {
              if (!prev || prev.status === 'COMPLETED') {
                clearInterval(interval);
                return prev;
              }
              
              const currentPt = routePoints[Math.min(step, routePoints.length - 1)];
              setDriverLocation({ latitude: currentPt.latitude, longitude: currentPt.longitude });
              
              // Trigger a mock route deviation warning event at step 8
              if (step === 8) {
                setDeviationAlert('Simulation Warning: Vehicle has deviated 620m from the planned route.');
              }
              
              step++;
              if (step >= routePoints.length) {
                clearInterval(interval);
              }
              return prev;
            });
          }, 3000);
        }

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
    setPlannedRoute(null);
  };

  const fetchRideHistory = async () => {
    setRideHistory([
      { id: '1', date: 'Jul 05, 2026', fare: 18.50, status: 'COMPLETED', safety: 'SAFE', pickup: 'Brooklyn', dropoff: 'Manhattan' },
      { id: '2', date: 'Jul 02, 2026', fare: 12.00, status: 'COMPLETED', safety: 'SAFE', pickup: 'Queens', dropoff: 'Astoria' },
      { id: '3', date: 'Jun 28, 2026', fare: 25.50, status: 'COMPLETED', safety: 'DEVIATION_ALERT', pickup: 'Bronx', dropoff: 'JFK Airport' },
    ]);
  };

  const processPayment = async (rideId: string, paymentMethod: string, amount: number): Promise<boolean> => {
    setIsLoading(true);
    const res = await apiCall('/payments/process', 'POST', { rideId, paymentMethod, amount });
    setIsLoading(false);
    return res.success;
  };

  const submitReview = async (rideId: string, rating: number, comments: string): Promise<boolean> => {
    if (!activeRide || !activeRide.driver) return false;
    setIsLoading(true);
    const res = await apiCall('/reviews', 'POST', {
      rideId,
      revieweeId: activeRide.driver.userId,
      rating,
      comments
    });
    setIsLoading(false);
    return res.success;
  };

  const createRazorpayOrder = async (
    rideId: string,
    amount: number
  ): Promise<{ success: boolean; orderId?: string; keyId?: string; amount?: number }> => {
    setIsLoading(true);
    const res = await apiCall('/payments/order', 'POST', { rideId, amount });
    setIsLoading(false);
    return res;
  };

  const verifyRazorpayPayment = async (
    rideId: string,
    razorpayPaymentId: string,
    razorpayOrderId: string,
    razorpaySignature: string
  ): Promise<boolean> => {
    setIsLoading(true);
    const res = await apiCall('/payments/verify', 'POST', {
      rideId,
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature
    });
    setIsLoading(false);
    return res.success;
  };

  const fetchInvoiceHTML = async (paymentId: string): Promise<string | null> => {
    setIsLoading(true);
    const res = await apiCall(`/payments/invoice/${paymentId}`, 'GET');
    setIsLoading(false);
    return res as any;
  };

  const requestRefund = async (paymentId: string, amount?: number): Promise<boolean> => {
    setIsLoading(true);
    const res = await apiCall('/payments/refund', 'POST', { paymentId, amount });
    setIsLoading(false);
    return res.success;
  };

  const searchPlacesList = async (q: string): Promise<any[]> => {
    try {
      const res = await apiCall(`/rides/places/search?q=${encodeURIComponent(q)}`, 'GET');
      return res.success ? res.predictions : [];
    } catch {
      return [];
    }
  };

  const estimateRideFares = async (
    pickupCoords: number[],
    dropoffCoords: number[]
  ): Promise<{ success: boolean; estimates?: any[]; distance?: number }> => {
    try {
      setIsLoading(true);
      const res = await apiCall('/rides/estimate', 'POST', { pickupCoords, dropoffCoords });
      setIsLoading(false);
      return res;
    } catch {
      setIsLoading(false);
      return { success: false };
    }
  };

  const requestSelectedRide = async (
    pickup: any,
    dropoff: any,
    rideType: string,
    fare: number,
    paymentMethod: string,
    distance: number
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await apiCall('/rides/request', 'POST', {
        pickup,
        dropoff,
        rideType,
        fare,
        paymentMethod,
        distance
      });
      setIsLoading(false);
      if (res.success && res.ride) {
        setActiveRide(res.ride);
        return true;
      }
      return false;
    } catch {
      setIsLoading(false);
      return false;
    }
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
        plannedRoute,
        calculatePlannedRoute,
        requestRide,
        triggerSOS,
        cancelActiveRide,
        fetchRideHistory,
        clearAlert,
        processPayment,
        submitReview,
        createRazorpayOrder,
        verifyRazorpayPayment,
        fetchInvoiceHTML,
        requestRefund,
        searchPlacesList,
        estimateRideFares,
        requestSelectedRide,
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
