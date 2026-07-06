import { Router } from 'express';
import { verifyOTP, refreshToken } from '../controllers/auth.controller';
import { validateBody, otpVerifyRule } from '../middleware/validator';

const router = Router();

router.post('/otp/verify', validateBody(otpVerifyRule), verifyOTP);
router.post('/token/refresh', refreshToken);

export default router;
