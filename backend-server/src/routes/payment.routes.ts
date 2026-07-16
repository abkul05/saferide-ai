import { Router } from 'express';
import { 
  createRazorpayOrder, 
  verifyRazorpayPayment, 
  getPaymentHistory, 
  generateInvoice, 
  initiateRefund 
} from '../controllers/payment.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Create Razorpay Order
router.post('/order', authenticateJWT, createRazorpayOrder);

// Verify Razorpay payment signature
router.post('/verify', authenticateJWT, verifyRazorpayPayment);

// Get User Payment logs history
router.get('/history', authenticateJWT, getPaymentHistory);

// Retrieve PDF/HTML invoice printable receipt
router.get('/invoice/:paymentId', authenticateJWT, generateInvoice);

// Initiate payment refund
router.post('/refund', authenticateJWT, initiateRefund);

export default router;
