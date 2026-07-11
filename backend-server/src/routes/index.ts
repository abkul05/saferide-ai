import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import rideRoutes from './ride.routes';
import paymentRoutes from './payment.routes';
import reviewRoutes from './review.routes';

const router = Router();

// Health Check route
router.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'SafeRide AI API Server is operational',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rides', rideRoutes);
router.use('/payments', paymentRoutes);
router.use('/reviews', reviewRoutes);

export default router;
