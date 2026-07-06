import { Router } from 'express';
import { requestRide, acceptRide, startRide, completeRide, triggerPanic } from '../controllers/ride.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { UserRole } from '../constants/status';
import { validateBody, rideRequestRule } from '../middleware/validator';

const router = Router();

// Apply JWT authentication globally to all ride operations
router.use(authenticateJWT);

router.post('/request', requireRole(UserRole.PASSENGER), validateBody(rideRequestRule), requestRide);
router.post('/accept', requireRole(UserRole.DRIVER), acceptRide);
router.post('/start', startRide);
router.post('/complete', completeRide);
router.post('/panic', triggerPanic);

export default router;
