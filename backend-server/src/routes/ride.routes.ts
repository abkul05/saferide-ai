import { Router } from 'express';
import { 
  requestRide, 
  acceptRide, 
  startRide, 
  completeRide, 
  triggerPanic, 
  shareRide,
  searchPlaces,
  estimateRide,
  getRideHistory
} from '../controllers/ride.controller';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { UserRole } from '../constants/status';
import { validateBody, rideRequestRule } from '../middleware/validator';

const router = Router();

// Public Guardian tracking endpoint (unauthenticated)
router.get('/share/:rideId', shareRide);

// Apply JWT authentication to rest of the ride operations
router.use(authenticateJWT);

router.get('/places/search', searchPlaces);
router.post('/estimate', estimateRide);
router.post('/request', requireRole(UserRole.PASSENGER), validateBody(rideRequestRule), requestRide);
router.post('/accept', requireRole(UserRole.DRIVER), acceptRide);
router.post('/start', startRide);
router.post('/complete', completeRide);
router.post('/panic', triggerPanic);
router.get('/history', getRideHistory);

export default router;
