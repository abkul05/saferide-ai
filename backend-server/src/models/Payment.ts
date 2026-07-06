import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
  rideId: Types.ObjectId;
  passengerId: Types.ObjectId;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentMethod: 'CARD' | 'CASH' | 'WALLET';
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>({
  rideId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Ride', 
    required: true,
    unique: true, 
    index: true 
  },
  passengerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  amount: { type: Number, required: true, min: 0.01 },
  status: { 
    type: String, 
    enum: ['PENDING', 'COMPLETED', 'FAILED'], 
    default: 'PENDING',
    index: true 
  },
  paymentMethod: { 
    type: String, 
    enum: ['CARD', 'CASH', 'WALLET'], 
    required: true 
  },
  transactionId: { 
    type: String, 
    unique: true, 
    sparse: true 
  }
}, {
  timestamps: true
});

export const Payment = model<IPayment>('Payment', paymentSchema);
