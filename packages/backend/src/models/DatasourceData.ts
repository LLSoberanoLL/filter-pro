import mongoose from './index';

/**
 * Schema para armazenar dados sincronizados de datasources externos
 * Cada registro representa uma opção (label/value) que veio de uma API ou banco externo
 */
const DatasourceDataSchema = new mongoose.Schema({
  // Identificação
  datasourceId: { type: String, required: true, index: true },
  projectKey: { type: String, required: true, index: true },
  
  // Código externo (chave primária do sistema externo)
  externalCode: { type: String, required: true },
  
  // Dados da opção
  label: { type: String, required: true },
  value: { type: String, required: true },
  
  // Dados adicionais (qualquer campo extra retornado pela API)
  metadata: { type: mongoose.Schema.Types.Mixed },
  
  // Status
  enabled: { type: Boolean, default: true, index: true },
  
  // Auditoria
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  disabledAt: { type: Date }
}, {
  timestamps: true
});

// Índices compostos para queries rápidas
DatasourceDataSchema.index({ datasourceId: 1, externalCode: 1 }, { unique: true });
DatasourceDataSchema.index({ datasourceId: 1, enabled: 1 });
DatasourceDataSchema.index({ projectKey: 1, datasourceId: 1, enabled: 1 });

// Índices para filtragem por metadata (wildcards)
// Permite filtrar por qualquer campo em metadata.* de forma eficiente
DatasourceDataSchema.index({ 'metadata.country': 1 }); // Para dependências de país
DatasourceDataSchema.index({ 'metadata.state': 1 });   // Para dependências de estado
DatasourceDataSchema.index({ 'metadata.city': 1 });    // Para dependências de cidade
DatasourceDataSchema.index({ 'metadata.category': 1 }); // Para categorias de produtos
DatasourceDataSchema.index({ 'metadata.brand': 1 });   // Para marcas

// Índice de texto para busca full-text
DatasourceDataSchema.index({ label: 'text', 'metadata.name': 'text' });

export const DatasourceData = mongoose.model('DatasourceData', DatasourceDataSchema);
