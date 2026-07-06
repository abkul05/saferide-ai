import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiCall, setAuthTokenInCache, loadAuthTokenFromStorage } from '../../data/api';

export interface IEmergencyContact {
  name: string;
  phoneNumber: string;
  relation?: string;
}

export interface IUser {
  id: string;
  phoneNumber: string;
  fullName?: string;
  email?: string;
  role: 'PASSENGER' | 'DRIVER' | 'ADMIN';
  isProfileComplete: boolean;
  emergencyContacts: IEmergencyContact[];
}

interface AuthContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  otpSent: boolean;
  phoneNumber: string;
  sendOTP: (phone: string) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<boolean>;
  completeProfile: (name: string, email: string) => Promise<boolean>;
  updateEmergencyContacts: (contacts: IEmergencyContact[]) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUser | null>(null);
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
        // Query profile from database
        const res = await apiCall('/users/profile', 'GET');
        if (res.success && res.user) {
          setUser(res.user);
          setIsAuthenticated(true);
        } else {
          // Token expired or invalid
          await setAuthTokenInCache(null);
        }
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
    setIsLoading(true);
    setPhoneNumber(phone);
    
    // Simulate SMS dispatch API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setOtpSent(true);
    setIsLoading(false);
    return true;
  };

  const verifyOTP = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    
    // Call our backend Auth Verify using the mock phone token format
    const mockToken = `mock-token-${phoneNumber}`;
    
    const res = await apiCall('/auth/otp/verify', 'POST', {
      firebaseIdToken: mockToken,
      role: 'PASSENGER'
    });

    if (res.success && res.accessToken && res.user) {
      await setAuthTokenInCache(res.accessToken);
      setUser(res.user);
      setIsAuthenticated(true);
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const completeProfile = async (name: string, email: string): Promise<boolean> => {
    setIsLoading(true);
    const res = await apiCall('/users/profile', 'PUT', { fullName: name, email });
    
    if (res.success && res.user) {
      setUser(res.user);
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const updateEmergencyContacts = async (contacts: IEmergencyContact[]): Promise<boolean> => {
    setIsLoading(true);
    const res = await apiCall('/users/emergency', 'PUT', { emergencyContacts: contacts });
    
    if (res.success && res.emergencyContacts) {
      if (user) {
        setUser({ ...user, emergencyContacts: res.emergencyContacts });
      }
      setIsLoading(false);
      return true;
    }
    
    setIsLoading(false);
    return false;
  };

  const logout = async () => {
    setIsLoading(true);
    await setAuthTokenInCache(null);
    setUser(null);
    setIsAuthenticated(false);
    setOtpSent(false);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        otpSent,
        phoneNumber,
        sendOTP,
        verifyOTP,
        completeProfile,
        updateEmergencyContacts,
        logout,
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
