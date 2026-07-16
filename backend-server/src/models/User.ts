import { Schema, model, Document } from 'mongoose';
import { UserRole } from '../constants/status';

export interface IEmergencyContact {
  name: string;
  phoneNumber: string;
  relation?: string;
}

export interface IUser extends Document {
  phoneNumber: string;
  fullName?: string;
  email?: string;
  role: UserRole;
  emergencyContacts: IEmergencyContact[];
  fcmToken?: string;
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  profilePicture?: string;
  homeAddress?: string;
  workAddress?: string;
  isProfileComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<IEmergencyContact>({
  name: { type: String, required: true, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  relation: { type: String, trim: true }
}, { _id: false });

const userSchema = new Schema<IUser>({
  phoneNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  },
  fullName: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  role: { 
    type: String, 
    enum: Object.values(UserRole), 
    default: UserRole.PASSENGER 
  },
  emergencyContacts: { 
    type: [emergencyContactSchema], 
    default: [] 
  },
  fcmToken: { type: String },
  gender: { type: String, enum: ['Male', 'Female', 'Other', ''] },
  dob: { type: String },
  bloodGroup: { type: String },
  profilePicture: { type: String },
  homeAddress: { type: String },
  workAddress: { type: String },
  isProfileComplete: { type: Boolean, default: false }
}, {
  timestamps: true
});

export const User = model<IUser>('User', userSchema);
