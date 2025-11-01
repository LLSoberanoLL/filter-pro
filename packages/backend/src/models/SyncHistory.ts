import mongoose from './index';

/**
 * Schema para histórico de sincronizações
 * Registra cada execução da sincronização para auditoria e debugging
 */
const SyncHistorySchema = new mongoose.Schema({
  datasourceId: { type: String, required: true, index: true },
  projectKey: { type: String, required: true, index: true },
  
  // Resultado da sincronização
  status: { type: String, required: true, enum: ['success', 'error', 'in_progress'] },
  
  // Estatísticas
  stats: {
    recordsFound: { type: Number, default: 0 },
    recordsAdded: { type: Number, default: 0 },
    recordsUpdated: { type: Number, default: 0 },
    recordsDisabled: { type: Number, default: 0 },
    duration: { type: Number } // em ms
  },
  
  // Detalhes
  error: { type: String },
  triggeredBy: { type: String, enum: ['cron', 'manual', 'system'], default: 'cron' },
  
  // Timestamp
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
}, {
  timestamps: true
});

SyncHistorySchema.index({ datasourceId: 1, createdAt: -1 });
SyncHistorySchema.index({ status: 1, createdAt: -1 });

export const SyncHistory = mongoose.model('SyncHistory', SyncHistorySchema);
