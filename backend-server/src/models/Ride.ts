import { Schema, model, Document, Types } from 'mongoose';
import { RideStatus } from '../constants/status';

export interface ILocationPoint {
  address: string;
  location: {
    type: string;
    coordinates: number[]; // [longitude, latitude]
  };
}

export interface IRide extends Document {
  passengerId: Types.ObjectId;
  driverId?: Types.ObjectId;
  status: RideStatus;
  pickup: ILocationPoint;
  dropoff: ILocationPoint;
  plannedRouteGeometry?: string; // Encoded polyline string
  plannedRouteCoordinates?: number[][]; // Decoded points [[lng, lat], ...]
  fare: number;
  otpCode: string; // Dynamic OTP for starting the ride safely
  createdAt: Date;
  updatedAt: Date;
}

const locationPointSchema = new Schema<ILocationPoint>({
  address: { type: String, required: true, trim: true },
  location: {
    type: { 
      type: String, 
      enum: ['Point'], 
      default: 'Point',
      required: true 
    },
    coordinates: { 
      type: [Number], // [longitude, latitude]
      required: true 
    }
  }
}, { _id: false });

const rideSchema = new Schema<IRide>({
  passengerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  driverId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    index: true 
  },
  status: { 
    type: String, 
    enum: Object.values(RideStatus), 
    default: RideStatus.REQUESTED,
    index: true
  },
  pickup: { type: locationPointSchema, required: true },
  dropoff: { type: locationPointSchema, required: true },
  plannedRouteGeometry: { type: String },
  plannedRouteCoordinates: { 
    type: [[Number]], // Array of [longitude, latitude] pairs
    default: []
  },
  fare: { type: Number, required: true },
  otpCode: { type: String, required: true }
}, {
  timestamps: true
});

export const Ride = model<IRide>('Ride', rideSchema);
