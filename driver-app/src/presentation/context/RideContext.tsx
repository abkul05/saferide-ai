import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiCall } from '../../data/api';
import { socketClient } from '../../data/socket';
import { useAuth } from './AuthContext';

export interface IRideRequest {
  id: string;
  pickup: { address: string; location: { coordinates: number[] } };
  dropoff: { address: string; location: { coordinates: number[] } };
  fare: number;
}

export interface IActiveRide {
  id: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pickup: { address: string; location: { coordinates: number[] } };
  dropoff: { address: string; location: { coordinates: number[] } };
  fare: number;
  otpCode: string;
}

interface RideContextType {
  isOnline: boolean;
  activeRide: IActiveRide | null;
  incomingRequest: IRideRequest | null;
  rideHistory: any[];
  earnings: number;
  toggleOnline: () => Promise<void>;
  acceptRequest: () => Promise<boolean>;
  rejectRequest: () => void;
  startRide: (otp: string) => Promise<boolean>;
  completeRide: () => Promise<boolean>;
  updateLocation: (lat: number, lng: number) => void;
  fetchRideHistory: () => Promise<void>;
}

const RideContext = createContext<RideContextType | undefined>(undefined);

export const RideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { driverDetails, updateOnlineStatus } = useAuth();
  
  const [isOnline, setIsOnline] = useState<boolean>(false);
  const [activeRide, setActiveRide] = useState<IActiveRide | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<IRideRequest | null>(null);
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<number>(0);

  useEffect(() => {
    if (isOnline) {
      // Connect to sockets to listen for requests
      socketClient.connect().then(() => {
        // Listen to broadcasts of new passenger bookings
        socketClient.on('ride:request_broadcast', (data: any) => {
          setIncomingRequest({
            id: data.rideId,
            pickup: data.pickup,
            dropoff: data.dropoff,
            fare: data.fare,
          });
        });
      }).catch((err) => {
        console.warn('Socket connect failed:', err);
      });

      // MOCK REQUEST GENERATOR SIMULATOR FOR TEST
      // Trigger a simulated incoming booking notification 6 seconds after going online
      const timeout = setTimeout(() => {
        if (!incomingRequest && !activeRide) {
          setIncomingRequest({
            id: 'mock_ride_555',
            pickup: { address: 'Astoria Boulevard, Queens', location: { coordinates: [-73.923, 40.768] } },
            dropoff: { address: 'Grand Central Station, Manhattan', location: { coordinates: [-73.977, 40.752] } },
            fare: 28.50
          });
        }
      }, 6000);

      return () => {
        clearTimeout(timeout);
      };
    } else {
      socketClient.disconnect();
    }
  }, [isOnline]);

  const toggleOnline = async (): Promise<void> => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    updateOnlineStatus(nextState);
    if (!nextState) {
      setIncomingRequest(null);
    }
  };

  const acceptRequest = async (): Promise<boolean> => {
    if (!incomingRequest) return false;

    // Hit accepts endpoint on backend
    const res = await apiCall('/rides/accept', 'POST', { rideId: incomingRequest.id });

    if (res.success && res.ride) {
      setActiveRide({
        id: res.ride._id,
        status: res.ride.status,
        pickup: res.ride.pickup,
        dropoff: res.ride.dropoff,
        fare: res.ride.fare,
        otpCode: res.ride.otpCode,
      });
      setIncomingRequest(null);
      return true;
    }

    // Fallback Mock mode support if backend offline
    if (incomingRequest.id.startsWith('mock_')) {
      setActiveRide({
        id: incomingRequest.id,
        status: 'ACCEPTED',
        pickup: incomingRequest.pickup,
        dropoff: incomingRequest.dropoff,
        fare: incomingRequest.fare,
        otpCode: '1234', // Hardcoded match OTP
      });
      setIncomingRequest(null);
      return true;
    }

    return false;
  };

  const rejectRequest = () => {
    setIncomingRequest(null);
  };

  const startRide = async (otp: string): Promise<boolean> => {
    if (!activeRide) return false;

    const res = await apiCall('/rides/start', 'POST', { rideId: activeRide.id, otpCode: otp });

    if (res.success && res.ride) {
      setActiveRide({
        ...activeRide,
        status: res.ride.status,
      });
      return true;
    }

    // Mock bypass
    if (activeRide.id.startsWith('mock_') && otp === '1234') {
      setActiveRide({
        ...activeRide,
        status: 'IN_PROGRESS',
      });
      return true;
    }

    return false;
  };

  const completeRide = async (): Promise<boolean> => {
    if (!activeRide) return false;

    const res = await apiCall('/rides/complete', 'POST', { rideId: activeRide.id });

    if (res.success && res.ride) {
      // Add to earnings
      setEarnings((prev) => prev + activeRide.fare);
      setActiveRide(null);
      fetchRideHistory();
      return true;
    }

    // Mock bypass
    if (activeRide.id.startsWith('mock_')) {
      setEarnings((prev) => prev + activeRide.fare);
      setActiveRide(null);
      fetchRideHistory();
      return true;
    }

    return false;
  };

  const updateLocation = (lat: number, lng: number) => {
    // Send live coordinate telemetry frames to server
    socketClient.emit('driver:update_location', {
      lat,
      lng,
      rideId: activeRide?.id,
    });
  };

  const fetchRideHistory = async () => {
    // Mock History payload logs
    setRideHistory([
      { id: '101', date: 'Today', fare: 28.50, status: 'COMPLETED', pickup: 'Queens', dropoff: 'Grand Central' },
      { id: '102', date: 'Yesterday', fare: 22.00, status: 'COMPLETED', pickup: 'Long Island City', dropoff: 'Times Square' },
    ]);
  };

  return (
    <RideContext.Provider
      value={{
        isOnline,
        activeRide,
        incomingRequest,
        rideHistory,
        earnings,
        toggleOnline,
        acceptRequest,
        rejectRequest,
        startRide,
        completeRide,
        updateLocation,
        fetchRideHistory,
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
