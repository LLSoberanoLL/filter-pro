import mongoose from './index';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String },
  role: { type: String, enum: ['admin','viewer'], default: 'viewer' },
  hashedPassword: { type: String, required: true },
  projectKeys: { type: Array, default: [] }
}, {
  timestamps: true
});

export const User = mongoose.model('User', UserSchema);
