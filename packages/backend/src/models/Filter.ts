import mongoose from './index';

const FilterSchema = new mongoose.Schema({
  projectKey: { type: String, required: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  description: { type: String },
  type: { type: String, required: true },
  dataSource: { type: mongoose.Schema.Types.Mixed },
  optionsConfig: { type: mongoose.Schema.Types.Mixed },
  dependencies: { type: Array, default: [] },
  order: { type: Number, default: 0 },
  uiConfig: { type: mongoose.Schema.Types.Mixed },
  validationRules: { type: mongoose.Schema.Types.Mixed },
  createdBy: { type: String },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() },
  active: { type: Boolean, default: true }
});

FilterSchema.index({ projectKey: 1, slug: 1 }, { unique: true });

export const Filter = mongoose.model('Filter', FilterSchema);
