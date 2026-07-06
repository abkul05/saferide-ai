import { Schema, model, Document, Types } from 'mongoose';

export interface INotification extends Document {
  recipientId: Types.ObjectId;
  title: string;
  message: string;
  type: 'RIDE_STATUS' | 'SAFETY_ALERT' | 'PAYMENT';
  isRead: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>({
  recipientId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  type: { 
    type: String, 
    enum: ['RIDE_STATUS', 'SAFETY_ALERT', 'PAYMENT'], 
    required: true 
  },
  isRead: { type: Boolean, default: false, index: true },
  expiresAt: { 
    type: Date, 
    required: true,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 Days expiration
  }
}, {
  timestamps: true
});

// TTL index to purge expired notifications automatically
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Notification = model<INotification>('Notification', notificationSchema);
