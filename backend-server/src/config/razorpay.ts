import Razorpay from 'razorpay';
import { logger } from './logger';

const KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

let razorpayInstance: any = null;

if (KEY_ID && KEY_SECRET) {
  try {
    razorpayInstance = new Razorpay({
      key_id: KEY_ID,
      key_secret: KEY_SECRET
    });
    logger.info('Razorpay API client initialized successfully.');
  } catch (error: any) {
    logger.error(`Razorpay init error: ${error.message}`);
  }
} else {
  logger.warn('Razorpay credentials missing. Activating sandbox mock wrapper.');
  
  // High-fidelity sandbox mock instance matching SDK methods
  razorpayInstance = {
    orders: {
      create: async (options: { amount: number; currency: string; receipt: string }) => {
        logger.info(`[Razorpay Mock] Creating order: Receipt: ${options.receipt}, Amount: ${options.amount}`);
        return {
          id: `order_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          amount: options.amount,
          currency: options.currency,
          receipt: options.receipt,
          status: 'created'
        };
      }
    },
    payments: {
      refund: async (paymentId: string, options?: { amount: number }) => {
        logger.info(`[Razorpay Mock] Refunding payment ${paymentId} for amount: ${options?.amount}`);
        return {
          id: `rfnd_${Math.random().toString(36).substring(2, 11).toUpperCase()}`,
          payment_id: paymentId,
          amount: options?.amount || 0,
          status: 'processed'
        };
      }
    }
  };
}

export { razorpayInstance };
export default razorpayInstance;
