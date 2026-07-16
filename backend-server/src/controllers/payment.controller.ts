import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Payment } from '../models/Payment';
import { Ride } from '../models/Ride';
import { User } from '../models/User';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { razorpayInstance } from '../config/razorpay';
import { logger } from '../config/logger';

/**
 * Creates a Razorpay Order ID for checkouts (Amount in INR)
 */
export const createRazorpayOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, amount } = req.body;

    if (!rideId || !amount) {
      throw new AppError('rideId and amount are required parameters', 400);
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new AppError('Ride booking not found', 404);
    }

    // Amount in Razorpay is parsed in lowest currency unit (paise for INR)
    const amountInPaise = Math.round(amount * 100);

    // Call Razorpay SDK to create order
    const order = await razorpayInstance.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: rideId.toString()
    });

    logger.info(`Razorpay order created: ${order.id} for ride: ${rideId}`);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_mock_key_id'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verifies Razorpay payment signature & confirms payment
 */
export const verifyRazorpayPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!rideId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      throw new AppError('rideId, razorpayPaymentId, razorpayOrderId, and razorpaySignature are required', 400);
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new AppError('Ride booking not found', 404);
    }

    // Verify Signature: HMAC SHA256 (orderId + "|" + paymentId) using key secret
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    let isSignatureValid = false;

    if (secret) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      isSignatureValid = generatedSignature === razorpaySignature;
    } else {
      // Sandbox fallback mode: verify true automatically
      logger.warn('Razorpay signature skipped. Sandbox validation bypass active.');
      isSignatureValid = true;
    }

    if (!isSignatureValid) {
      throw new AppError('Razorpay payment signature mismatch. Verification failed.', 400);
    }

    // Create Payment log document
    const payment = await Payment.create({
      rideId,
      passengerId: req.user?.id,
      amount: ride.fare,
      paymentMethod: 'CARD', // Razorpay transactions logged as Card/Online
      status: 'COMPLETED',
      transactionId: razorpayPaymentId
    });

    // Mark ride completed in database
    ride.status = 'COMPLETED';
    await ride.save();

    logger.info(`Razorpay Payment verified successfully for ride: ${rideId}. Txn: ${razorpayPaymentId}`);

    res.status(200).json({
      success: true,
      message: 'Razorpay payment verified & completed successfully',
      payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves payment history logs for the active user session
 */
export const getPaymentHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError('User session not found', 401);
    }

    const payments = await Payment.find({ passengerId: req.user.id })
      .populate({ path: 'rideId', select: 'pickup dropoff status' })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      payments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Renders a stylized HTML printable invoice break down
 */
export const generateInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findById(paymentId).populate('rideId');

    if (!payment) {
      res.status(404).send('<h1>Invoice details not found</h1>');
      return;
    }

    const passenger = await User.findById(payment.passengerId);
    const passengerName = passenger?.fullName || 'SafeRide Passenger';
    const dateFormatted = new Date(payment.createdAt).toLocaleDateString();

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>SafeRide AI - Payment Invoice</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 40px; background-color: #FAFAFA; }
          .invoice-box { max-width: 600px; margin: auto; padding: 30px; border: 1px solid #EEE; box-shadow: 0 0 10px rgba(0, 0, 0, 0.05); background: #FFF; border-radius: 8px; }
          .title { font-size: 28px; font-weight: 800; color: #10B981; }
          .header-row { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .details-col { font-size: 13px; line-height: 20px; color: #666; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th { background: #F3F4F6; text-align: left; padding: 10px; font-size: 12px; text-transform: uppercase; }
          .table td { padding: 12px 10px; border-bottom: 1px solid #EEE; font-size: 14px; }
          .total-row { font-weight: bold; font-size: 16px; background: #F9FAFB; }
          .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header-row">
            <div>
              <span class="title">🛡️ SafeRide AI</span>
              <div style="font-size:12px;color:#999;margin-top:4px;">Ride Booking Invoice Receipt</div>
            </div>
            <div class="details-col" style="text-align:right;">
              <strong>Invoice #:</strong> ${payment._id.toString().substring(0, 8).toUpperCase()}<br>
              <strong>Date:</strong> ${dateFormatted}<br>
              <strong>Status:</strong> ${payment.status}
            </div>
          </div>

          <div class="header-row" style="border-top:1px solid #EEE; padding-top:16px;">
            <div class="details-col">
              <strong>Billed To:</strong><br>
              ${passengerName}<br>
              ${passenger?.phoneNumber}
            </div>
            <div class="details-col" style="text-align:right;">
              <strong>Transaction Reference ID:</strong><br>
              ${payment.transactionId}
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>AI Safeguarded Transit Journey</strong><br>
                  <span style="font-size:11px;color:#666;">
                    Pickup: ${(payment.rideId as any)?.pickup?.address || 'Pickup Point'}<br>
                    Dropoff: ${(payment.rideId as any)?.dropoff?.address || 'Dropoff Point'}
                  </span>
                </td>
                <td style="text-align:right;vertical-align:top;">$${payment.amount.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Charged Amount (INR Equivalent)</td>
                <td style="text-align:right;">$${payment.amount.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Thank you for riding with SafeRide AI! Your safe transit is our priority.<br>
            For support requests contact safety@saferide.ai
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
};

/**
 * Initiates Razorpay payment refund for cancelled prepaid rides
 */
export const initiateRefund = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { paymentId, amount } = req.body;

    if (!paymentId) {
      throw new AppError('paymentId parameter is required', 400);
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment record not found', 404);
    }

    if (payment.status !== 'COMPLETED') {
      throw new AppError('Only completed transactions can be refunded', 400);
    }

    // Default to refunding full amount if not specified
    const refundAmount = amount ? Math.round(amount * 100) : Math.round(payment.amount * 100);

    // Call Razorpay API to process refund
    const refund = await razorpayInstance.payments.refund(payment.transactionId, {
      amount: refundAmount
    });

    // Update payment status to REFUNDED
    payment.status = 'REFUNDED';
    await payment.save();

    logger.info(`Razorpay Refund processed for transaction: ${payment.transactionId}. Refund ID: ${refund.id}`);

    res.status(200).json({
      success: true,
      message: 'Razorpay refund processed successfully',
      refund
    });
  } catch (error) {
    next(error);
  }
};
