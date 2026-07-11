import { Response, NextFunction } from 'express';
import { Payment } from '../models/Payment';
import { Ride } from '../models/Ride';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';

export const processPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, paymentMethod, amount } = req.body;

    if (!rideId || !paymentMethod || !amount) {
      throw new AppError('rideId, paymentMethod, and amount are required', 400);
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new AppError('Ride booking not found', 404);
    }

    // Check if payment already exists for this ride to prevent double-billing
    const existingPayment = await Payment.findOne({ rideId });
    if (existingPayment) {
      throw new AppError('Payment already processed for this ride booking', 400);
    }

    // Generate mock transaction ID
    const transactionId = `txn_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

    // Create Payment log document
    const payment = await Payment.create({
      rideId,
      passengerId: req.user?.id,
      amount,
      paymentMethod,
      status: 'COMPLETED', // Directly mark complete for mock validation
      transactionId
    });

    logger.info(`Payment processed successfully for ride: ${rideId}. Txn: ${transactionId}`);

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      payment
    });
  } catch (error) {
    next(error);
  }
};
