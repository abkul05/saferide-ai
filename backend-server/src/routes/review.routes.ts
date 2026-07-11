import { Router } from 'express';
import { submitReview } from '../controllers/review.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/', authenticateJWT, submitReview);

export default router;
