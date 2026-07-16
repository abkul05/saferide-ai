import React, { createContext, useState, useEffect, useContext } from 'react';
import { apiCall, setAuthTokenInCache, loadAuthTokenFromStorage } from '../../data/api';
import { auth } from '../../config/firebase';
import { 
  signInWithPhoneNumber, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  ConfirmationResult,
  ApplicationVerifier
} from 'firebase/auth';

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
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  profilePicture?: string;
  homeAddress?: string;
  workAddress?: string;
}

interface AuthContextType {
  user: IUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  otpSent: boolean;
  phoneNumber: string;
  sendOTP: (phone: string, appVerifier: ApplicationVerifier) => Promise<boolean>;
  verifyOTP: (code: string) => Promise<boolean>;
  completeProfile: (profileData: {
    fullName: string;
    email: string;
    gender: string;
    dob: string;
    bloodGroup: string;
    profilePicture?: string;
    homeAddress: string;
    workAddress: string;
  }) => Promise<boolean>;
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
  
  // Track Firebase confirmation resolver reference
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);

  // 1. Persistent Login: Monitor Firebase Auth State Changed
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser) {
          console.log('Firebase persistent session found:', firebaseUser.uid);
          const customToken = await loadAuthTokenFromStorage();
          
          if (customToken) {
            // Verify and load profile with backend server
            const res = await apiCall('/users/profile', 'GET');
            if (res.success && res.user) {
              setUser(res.user);
              setIsAuthenticated(true);
            } else {
              // Custom JWT token expired: re-verify session
              await reauthenticateSession(firebaseUser);
            }
          } else {
            // No custom token: re-authenticate session
            await reauthenticateSession(firebaseUser);
          }
        } else {
          // No active session
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.warn('Error verifying persistent session:', error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper to re-verify Firebase session with Backend and get custom JWT
  const reauthenticateSession = async (firebaseUser: FirebaseUser) => {
    try {
      const firebaseIdToken = await firebaseUser.getIdToken();
      const res = await apiCall('/auth/otp/verify', 'POST', {
        firebaseIdToken,
        role: 'PASSENGER'
      });

      if (res.success && res.accessToken && res.user) {
        await setAuthTokenInCache(res.accessToken);
        setUser(res.user);
        setIsAuthenticated(true);
      } else {
        await logout();
      }
    } catch {
      await logout();
    }
  };

  // 2. Dispatch OTP code via Firebase Client SDK
  // 2. Dispatch OTP code via Firebase Client SDK (Sandbox Mock bypass)
  const sendOTP = async (phone: string, appVerifier: ApplicationVerifier): Promise<boolean> => {
    setIsLoading(true);
    setPhoneNumber(phone);
    
    console.log('Sandbox bypass: resolving local mock SMS verifier for', phone);
    setConfirmResult({
      confirm: async (code: string) => {
        if (code !== '654321') {
          throw new Error('Invalid OTP verification code. Use code 654321.');
        }
        return {
          user: {
            uid: 'mock-sandbox-uid-passenger-123',
            getIdToken: async () => 'mock-firebase-id-token-passenger'
          }
        } as any;
      }
    } as any);

    setOtpSent(true);
    setIsLoading(false);
    return true;
  };

  // 3. Confirm OTP and fetch ID Token
  const verifyOTP = async (code: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      if (!confirmResult) {
        throw new Error('Verification session not initialized. Re-enter phone.');
      }

      // Verify SMS code using confirmation resolver
      const userCredential = await confirmResult.confirm(code);
      
      if (!userCredential.user) {
        throw new Error('Authentication returned empty credentials.');
      }

      // Get verified Firebase ID Token string
      const firebaseIdToken = await userCredential.user.getIdToken();

      // Submit token to backend server to get Custom JWT
      const res = await apiCall('/auth/otp/verify', 'POST', {
        firebaseIdToken,
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
    } catch (error: any) {
      console.error('Firebase verifyOTP Error:', error.message);
      setIsLoading(false);
      throw error;
    }
  };

  const completeProfile = async (profileData: {
    fullName: string;
    email: string;
    gender: string;
    dob: string;
    bloodGroup: string;
    profilePicture?: string;
    homeAddress: string;
    workAddress: string;
  }): Promise<boolean> => {
    setIsLoading(true);
    const res = await apiCall('/users/profile', 'PUT', profileData);
    
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

  // 4. Logout Session
  const logout = async () => {
    setIsLoading(true);
    try {
      await signOut(auth);
      await setAuthTokenInCache(null);
      setUser(null);
      setIsAuthenticated(false);
      setOtpSent(false);
      setConfirmResult(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
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
