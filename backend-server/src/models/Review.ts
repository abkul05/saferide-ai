import { Schema, model, Document, Types } from 'mongoose';

export interface IReview extends Document {
  rideId: Types.ObjectId;
  reviewerId: Types.ObjectId;
  revieweeId: Types.ObjectId;
  rating: number;
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>({
  rideId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Ride', 
    required: true,
    index: true 
  },
  reviewerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  revieweeId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comments: { type: String, trim: true, maxLength: 500 }
}, {
  timestamps: true
});

// Compound unique index to restrict a user to one review per ride
reviewSchema.index({ rideId: 1, reviewerId: 1 }, { unique: true });

export const Review = model<IReview>('Review', reviewSchema);
