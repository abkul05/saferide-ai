import { Router } from 'express';
import { getProfile, updateProfile, updateEmergencyContacts, registerDriver } from '../controllers/user.controller';
import { authenticateJWT } from '../middleware/auth';
import { validateBody, profileSetupRule, updateEmergencyContactsRule } from '../middleware/validator';

const router = Router();

// Secure all user operations under JWT authentication
router.get('/profile', authenticateJWT, getProfile);
router.put('/profile', authenticateJWT, validateBody(profileSetupRule), updateProfile);
router.put('/emergency', authenticateJWT, validateBody(updateEmergencyContactsRule), updateEmergencyContacts);
router.post('/driver/register', authenticateJWT, registerDriver);

export default router;
