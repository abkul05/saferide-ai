import { logger } from '../config/logger';

export interface TelemetryMatrix {
  routeDeviationAlertsCount: number;
  driverRating: number;
  isNightTime: boolean;
  averageSpeed: number; // in km/h
  unexpectedStopsCount: number;
  isEmergencyTriggered: boolean;
}

export interface SafetyScoreReport {
  score: number;
  severity: 'EXCELLENT' | 'SAFE' | 'CAUTION' | 'HIGH_RISK';
  deductions: string[];
}

/**
 * Calculates a dynamic, real-time safety score (0-100) based on ride telemetry indicators
 */
export const calculateSafetyScore = (matrix: TelemetryMatrix): SafetyScoreReport => {
  let score = 100;
  const deductions: string[] = [];

  // 1. Critical SOS Panic overrides: crash score immediately
  if (matrix.isEmergencyTriggered) {
    logger.warn('Safety Score override: Emergency Button or SOS trigger detected.');
    return {
      score: 0,
      severity: 'HIGH_RISK',
      deductions: ['🚨 Immediate SOS panic activation']
    };
  }

  // 2. Driver Rating penalty (Scale score based on low rating scores)
  if (matrix.driverRating < 4.8) {
    const penalty = Math.min(25, Math.max(0, (4.8 - matrix.driverRating) * 25));
    if (penalty > 0) {
      score -= penalty;
      deductions.push(`👤 Low pilot rating profile: -${penalty.toFixed(0)} pts`);
    }
  }

  // 3. Route Deviation alerts penalty
  if (matrix.routeDeviationAlertsCount > 0) {
    const penalty = matrix.routeDeviationAlertsCount * 15;
    score -= penalty;
    deductions.push(`🗺️ Route deviation alerts (${matrix.routeDeviationAlertsCount}): -${penalty} pts`);
  }

  // 4. Night-Time caution index
  if (matrix.isNightTime) {
    score -= 5;
    deductions.push('🌙 Late night transit hazard window: -5 pts');
  }

  // 5. Speed limit checks
  if (matrix.averageSpeed > 120) {
    score -= 25;
    deductions.push('⚡ Dangerous speeding violation (>120km/h): -25 pts');
  } else if (matrix.averageSpeed > 100) {
    score -= 10;
    deductions.push('⚠️ Moderate speeding caution (>100km/h): -10 pts');
  }

  // 6. Unexpected stops logs penalty
  if (matrix.unexpectedStopsCount > 0) {
    const penalty = matrix.unexpectedStopsCount * 10;
    score -= penalty;
    deductions.push(`🛑 Unexpected stationary stops (${matrix.unexpectedStopsCount}): -${penalty} pts`);
  }

  // Enforce score constraints [0, 100]
  score = Math.max(0, Math.min(100, Math.round(score)));

  let severity: 'EXCELLENT' | 'SAFE' | 'CAUTION' | 'HIGH_RISK' = 'SAFE';
  if (score >= 85) severity = 'EXCELLENT';
  else if (score >= 70) severity = 'SAFE';
  else if (score >= 50) severity = 'CAUTION';
  else severity = 'HIGH_RISK';

  return {
    score,
    severity,
    deductions
  };
};
