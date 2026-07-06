import { Schema, model, Document, Types } from 'mongoose';
import { AlertTriggerType, AlertSeverity, AlertStatus } from '../constants/status';

export interface ISafetyAlert extends Document {
  rideId: Types.ObjectId;
  triggerType: AlertTriggerType;
  severity: AlertSeverity;
  status: AlertStatus;
  details?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const safetyAlertSchema = new Schema<ISafetyAlert>({
  rideId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Ride', 
    required: true,
    index: true 
  },
  triggerType: { 
    type: String, 
    enum: Object.values(AlertTriggerType), 
    required: true 
  },
  severity: { 
    type: String, 
    enum: Object.values(AlertSeverity), 
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(AlertStatus), 
    default: AlertStatus.ACTIVE,
    index: true 
  },
  details: { type: String, trim: true },
  resolvedAt: { type: Date },
  resolutionNotes: { type: String, trim: true }
}, {
  timestamps: true
});

export const SafetyAlert = model<ISafetyAlert>('SafetyAlert', safetyAlertSchema);
