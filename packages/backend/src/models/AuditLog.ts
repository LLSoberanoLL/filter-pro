import mongoose from './index';

const AuditLogSchema = new mongoose.Schema({
  projectKey: { type: String },
  userId: { type: String },
  action: { type: String },
  entity: { type: String },
  entityId: { type: String },
  timestamp: { type: Date, default: () => new Date() },
  details: { type: mongoose.Schema.Types.Mixed }
});

export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
