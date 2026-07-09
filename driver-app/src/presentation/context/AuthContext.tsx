import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiCall, setAuthTokenInCache, loadAuthTokenFromStorage } from '../../data/api';

export interface IVehicle {
  make: string;
  model: string;
  color: string;
  plateNumber: string;
}

export interface IDriverUser {
  id: string;
  phoneNumber: string;
  fullName?: string;
  email?: string;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  isProfileComplete: boolean;
}

export interface IDriverDetails {
  userId: string;
  vehicle: IVehicle;
  isOnline: boolean;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  rating: number;
}

interface AuthContextType {
  user: IDriverUser | null;
  driverDetails: IDriverDetails | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  otpSent: boolean;
  phoneNumber: string;
  sendOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<boolean>;
  registerVehicle: (vehicle: IVehicle) => Promise<boolean>;
  logout: () => Promise<void>;
  updateOnlineStatus: (isOnline: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IDriverUser | null>(null);
  const [driverDetails, setDriverDetails] = useState<IDriverDetails | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const storedToken = await loadAuthTokenFromStorage();
      if (storedToken) {
        const res = await apiCall('/users/profile', 'GET');
        if (res.success && res.user) {
          setUser(res.user);
          if (res.driverDetails) {
            setDriverDetails(res.driverDetails);
          }
          setIsAuthenticated(true);
        } else {
          await setAuthTokenInCache(null);
        }
      }
    } catch {
      // Network/Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
    setIsLoading(true);
    setPhoneNumber(phone);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay simulation
    setOtpSent(true);
    setIsLoading(false);
    return true;
  };

  const verifyOTP = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    const mockToken = `mock-token-${phoneNumber}`;
    
    const res = await apiCall('/auth/otp/verify', 'POST', {
      firebaseIdToken: mockToken,
      role: 'DRIVER'
    });

    if (res.success && res.accessToken && res.user) {
      await setAuthTokenInCache(res.accessToken);
      setUser(res.user);
      if (res.driverDetails) {
        setDriverDetails(res.driverDetails);
      }
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const registerVehicle = async (vehicle: IVehicle): Promise<boolean> => {
    setIsLoading(true);
    const res = await apiCall('/users/driver/register', 'POST', { vehicle });
    
    if (res.success && res.driverDetails) {
      setDriverDetails(res.driverDetails);
      if (user) {
        setUser({ ...user, role: 'DRIVER', isProfileComplete: true });
      }
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const updateOnlineStatus = (isOnline: boolean) => {
    if (driverDetails) {
      setDriverDetails({
        ...driverDetails,
        isOnline,
        status: isOnline ? 'AVAILABLE' : 'OFFLINE'
      });
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await setAuthTokenInCache(null);
    setUser(null);
    setDriverDetails(null);
    setIsAuthenticated(false);
    setOtpSent(false);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        driverDetails,
        isAuthenticated,
        isLoading,
        otpSent,
        phoneNumber,
        sendOTP,
        verifyOTP,
        registerVehicle,
        logout,
        updateOnlineStatus
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
