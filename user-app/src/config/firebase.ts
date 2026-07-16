import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Replace these values with your Firebase Project Configuration keys
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyMockAPIKeyHereForTestingPurposes",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "saferide-ai-mock.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "saferide-ai-mock",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "saferide-ai-mock.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:123456789012:web:mockappid123456789"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize standard Firebase Auth (avoiding persistence registration bugs in Hermes)
const auth = getAuth(app);

export { app, auth };
export default app;
