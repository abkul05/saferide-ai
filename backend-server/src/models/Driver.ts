import { Schema, model, Document, Types } from 'mongoose';
import { DriverStatus } from '../constants/status';

export interface IVehicle {
  make: string;
  model: string;
  color: string;
  plateNumber: string;
}

export interface IDriver extends Document {
  userId: Types.ObjectId;
  vehicle: IVehicle;
  isOnline: boolean;
  status: DriverStatus;
  liveLocation?: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}

const vehicleSchema = new Schema<IVehicle>({
  make: { type: String, required: true, trim: true },
  model: { type: String, required: true, trim: true },
  color: { type: String, required: true, trim: true },
  plateNumber: { type: String, required: true, unique: true, trim: true }
}, { _id: false });

const driverSchema = new Schema<IDriver>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  vehicle: { type: vehicleSchema, required: true },
  isOnline: { type: Boolean, default: false, index: true },
  status: { 
    type: String, 
    enum: Object.values(DriverStatus), 
    default: DriverStatus.OFFLINE 
  },
  liveLocation: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point' 
    },
    coordinates: { 
      type: [Number], 
      default: [0, 0] // Default longitude, latitude
    }
  },
  rating: { type: Number, default: 5.0 }
}, {
  timestamps: true
});

// Create 2dsphere index for location queries
driverSchema.index({ liveLocation: '2dsphere' });

export const Driver = model<IDriver>('Driver', driverSchema);
