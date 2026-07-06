import * as admin from 'firebase-admin';
import { logger } from './logger';

const useMock = process.env.FIREBASE_USE_MOCK === 'true';

interface DecodedMockToken {
  uid: string;
  phone_number?: string;
  firebase?: {
    sign_in_provider: string;
  };
}

class FirebaseAdminService {
  private isInitialized = false;

  constructor() {
    if (useMock) {
      logger.info('Firebase Admin SDK: Running in MOCK Mode.');
      this.isInitialized = true;
      return;
    }

    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined;

      if (!projectId || !clientEmail || !privateKey) {
        logger.warn('Firebase configuration missing. Falling back to MOCK Mode.');
        process.env.FIREBASE_USE_MOCK = 'true';
        this.isInitialized = true;
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.isInitialized = true;
      logger.info('Firebase Admin SDK: Initialized successfully.');
    } catch (error: any) {
      logger.error(`Failed to initialize Firebase Admin SDK: ${error.message}. Falling back to MOCK Mode.`);
      process.env.FIREBASE_USE_MOCK = 'true';
      this.isInitialized = true;
    }
  }

  public async verifyIdToken(token: string): Promise<DecodedMockToken> {
    const isMockNow = process.env.FIREBASE_USE_MOCK === 'true';
    
    if (isMockNow) {
      logger.info(`Mock verification of token: ${token}`);
      
      // Decodes a mock token like "mock-token-passenger" or "mock-token-driver" or "+1234567890"
      let uid = 'mock_uid_12345';
      let phoneNumber = '+1234567890';

      if (token.startsWith('mock-token-driver')) {
        uid = 'mock_driver_uid';
        phoneNumber = '+1999999999';
      } else if (token.startsWith('mock-token-')) {
        const customPhone = token.replace('mock-token-', '');
        uid = `mock_uid_${customPhone}`;
        phoneNumber = customPhone;
      }

      return {
        uid,
        phone_number: phoneNumber,
        firebase: {
          sign_in_provider: 'phone',
        },
      };
    }

    // Real verification
    const decoded = await admin.auth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      phone_number: decoded.phone_number,
      firebase: decoded.firebase,
    };
  }
}

export const firebaseAdmin = new FirebaseAdminService();
export { admin };
