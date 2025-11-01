import mongoose from './index';

const ProjectSchema = new mongoose.Schema({
  projectKey: { type: String, required: true, index: true },
  name: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date() },
  owner: { type: String },
  config: { type: mongoose.Schema.Types.Mixed }
});

ProjectSchema.index({ projectKey: 1 }, { unique: true });

export const Project = mongoose.model('Project', ProjectSchema);
