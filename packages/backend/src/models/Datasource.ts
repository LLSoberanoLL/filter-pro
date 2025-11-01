import mongoose from './index';

const DatasourceSchema = new mongoose.Schema({
  projectKey: { type: String, required: true, index: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, enum: ['rest_api', 'mongodb', 'sql', 'static'] },
  enabled: { type: Boolean, default: true },
  
  // Configuração específica por tipo
  config: { type: mongoose.Schema.Types.Mixed },
  
  // Schema dos dados retornados
  sampleSchema: { type: mongoose.Schema.Types.Mixed },
  
  // Configuração de sincronização
  syncConfig: {
    enabled: { type: Boolean, default: false },
    interval: { type: String, default: '1h' }, // 5m, 15m, 1h, 6h, 24h
    externalCodeField: { type: String }, // Campo que identifica o registro na API externa
    labelField: { type: String, default: 'label' },
    valueField: { type: String, default: 'value' }
  },
  
  // Metadados de sincronização
  lastSync: {
    date: { type: Date },
    status: { type: String, enum: ['success', 'error', 'in_progress'] },
    recordsAdded: { type: Number, default: 0 },
    recordsUpdated: { type: Number, default: 0 },
    recordsDisabled: { type: Number, default: 0 },
    error: { type: String }
  }
}, {
  timestamps: true
});

DatasourceSchema.index({ projectKey: 1, id: 1 }, { unique: true });
DatasourceSchema.index({ enabled: 1 });

export const Datasource = mongoose.model('Datasource', DatasourceSchema);
