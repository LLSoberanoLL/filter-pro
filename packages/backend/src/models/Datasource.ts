import mongoose from './index';

const DatasourceSchema = new mongoose.Schema({
  projectKey: { type: String, required: true, index: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  config: { type: mongoose.Schema.Types.Mixed },
  sampleSchema: { type: mongoose.Schema.Types.Mixed }
});

DatasourceSchema.index({ projectKey: 1, id: 1 }, { unique: true });

export const Datasource = mongoose.model('Datasource', DatasourceSchema);
