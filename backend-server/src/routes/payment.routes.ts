import { Router } from 'express';
import { processPayment } from '../controllers/payment.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

router.post('/process', authenticateJWT, processPayment);

export default router;
