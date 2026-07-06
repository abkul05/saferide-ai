import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export type ValidationRule = (body: any) => string | null;

export const validateBody = (rule: ValidationRule) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errorMsg = rule(req.body);
    if (errorMsg) {
      next(new AppError(errorMsg, 400));
      return;
    }
    next();
  };
};

// --- VALIDATION RULES DEFINITIONS ---

export const otpVerifyRule: ValidationRule = (body) => {
  if (!body.firebaseIdToken || typeof body.firebaseIdToken !== 'string' || body.firebaseIdToken.trim() === '') {
    return 'firebaseIdToken is required and must be a non-empty string.';
  }
  if (!body.role || (body.role !== 'PASSENGER' && body.role !== 'DRIVER')) {
    return "role is required and must be either 'PASSENGER' or 'DRIVER'.";
  }
  return null;
};

export const profileSetupRule: ValidationRule = (body) => {
  if (!body.fullName || typeof body.fullName !== 'string' || body.fullName.trim().length < 3) {
    return 'fullName is required and must be at least 3 characters.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!body.email || typeof body.email !== 'string' || !emailRegex.test(body.email)) {
    return 'email is required and must be a valid email address.';
  }
  return null;
};

export const updateEmergencyContactsRule: ValidationRule = (body) => {
  if (!body.emergencyContacts || !Array.isArray(body.emergencyContacts)) {
    return 'emergencyContacts must be a valid array.';
  }
  if (body.emergencyContacts.length === 0) {
    return 'At least one emergency contact is required.';
  }
  if (body.emergencyContacts.length > 3) {
    return 'Maximum of 3 emergency contacts is allowed.';
  }

  for (const contact of body.emergencyContacts) {
    if (!contact.name || typeof contact.name !== 'string' || contact.name.trim() === '') {
      return 'Each contact must have a non-empty name string.';
    }
    if (!contact.phoneNumber || typeof contact.phoneNumber !== 'string' || contact.phoneNumber.trim() === '') {
      return 'Each contact must have a non-empty phoneNumber string.';
    }
  }
  return null;
};

const isValidCoordinates = (loc: any): boolean => {
  if (!loc || typeof loc !== 'object') return false;
  if (!Array.isArray(loc.coordinates) || loc.coordinates.length !== 2) return false;
  const [lng, lat] = loc.coordinates;
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
};

export const rideRequestRule: ValidationRule = (body) => {
  if (!body.pickup || typeof body.pickup !== 'object') {
    return 'pickup object is required.';
  }
  if (!body.pickup.address || typeof body.pickup.address !== 'string') {
    return 'pickup address string is required.';
  }
  if (!isValidCoordinates(body.pickup.location)) {
    return 'pickup location coordinates are invalid or missing [longitude, latitude].';
  }

  if (!body.dropoff || typeof body.dropoff !== 'object') {
    return 'dropoff object is required.';
  }
  if (!body.dropoff.address || typeof body.dropoff.address !== 'string') {
    return 'dropoff address string is required.';
  }
  if (!isValidCoordinates(body.dropoff.location)) {
    return 'dropoff location coordinates are invalid or missing [longitude, latitude].';
  }
  return null;
};
