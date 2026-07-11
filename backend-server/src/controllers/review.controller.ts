import { Response, NextFunction } from 'express';
import { Review } from '../models/Review';
import { Driver } from '../models/Driver';
import { Ride } from '../models/Ride';
import { AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../config/logger';

export const submitReview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rideId, revieweeId, rating, comments } = req.body;

    if (!rideId || !revieweeId || !rating) {
      throw new AppError('rideId, revieweeId, and rating parameters are required', 400);
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      throw new AppError('Ride not found', 404);
    }

    const reviewerId = req.user?.id;
    if (!reviewerId) {
      throw new AppError('Reviewer session details missing', 401);
    }

    // Prevent duplicate reviews on same ride by same reviewer
    const existingReview = await Review.findOne({ rideId, reviewerId });
    if (existingReview) {
      throw new AppError('Review already submitted for this ride booking', 400);
    }

    // Log the review
    const review = await Review.create({
      rideId,
      reviewerId,
      revieweeId,
      rating,
      comments
    });

    logger.info(`Review log created for ride ${rideId} by reviewer ${reviewerId}`);

    // Update Driver Rating score dynamically if the reviewee is a driver
    const driver = await Driver.findOne({ userId: revieweeId });
    if (driver) {
      // Calculate overall average rating of all reviews targeting this driver
      const allDriverReviews = await Review.find({ revieweeId });
      const totalRatingsCount = allDriverReviews.length;
      
      const sumRatings = allDriverReviews.reduce((sum, r) => sum + r.rating, 0);
      const newAverageRating = Number((sumRatings / totalRatingsCount).toFixed(1));

      driver.rating = newAverageRating;
      await driver.save();
      logger.info(`Driver ${revieweeId} rating score updated to: ${newAverageRating}`);
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review
    });
  } catch (error) {
    next(error);
  }
};
