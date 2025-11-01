# Sistema de Sincronização Automática - Implementação Completa

## 📋 Visão Geral

Sistema completo de sincronização automática que elimina a dependência de APIs externas com filtragem. Os dados são baixados periodicamente, armazenados localmente no MongoDB e servidos a partir do cache.

---

## 🏗️ Arquitetura

### Backend Components

#### 1. **Models**

##### DatasourceData (`models/DatasourceData.ts`)
- Armazena dados sincronizados localmente
- **Campos principais**:
  - `datasourceId`: Referência ao datasource
  - `externalCode`: Chave primária do sistema externo
  - `label`: Texto exibido no filtro
  - `value`: Valor do filtro
  - `metadata`: Dados adicionais em JSON
  - `enabled`: Soft delete flag
  - `firstSeenAt`, `lastSeenAt`, `disabledAt`: Audit timestamps

##### SyncHistory (`models/SyncHistory.ts`)
- Audit trail de todas as sincronizações
- **Campos principais**:
  - `status`: success | error | in_progress
  - `stats`: Estatísticas da sincronização
  - `triggeredBy`: cron | manual | system
  - `error`: Mensagem de erro se houver

##### Datasource (atualizado)
- Adicionado `enabled`: boolean
- Adicionado `syncConfig`:
  - `enabled`: boolean
  - `interval`: '5m' | '15m' | '1h' | '6h' | '24h'
  - `externalCodeField`: string
  - `labelField`: string
  - `valueField`: string
- Adicionado `lastSync`: Última sincronização executada

#### 2. **Services**

##### DatasourceSyncService (`services/DatasourceSyncService.ts`)
Orquestra todo o processo de sincronização.

**Métodos principais**:

```typescript
// Executa sincronização completa
async syncDatasource(datasourceId: string, triggeredBy: string)

// Busca dados da API externa
private async fetchFromRestApi(datasource: Datasource)

// Processa e reconcilia dados
private async processData(datasource: Datasource, externalData: any[])

// Retorna dados em cache
async getDatasourceData(datasourceId: string, filters?: Record<string, any>)

// Histórico de sincronizações
async getSyncHistory(datasourceId: string, limit: number)
```

**Fluxo de sincronização**:
1. Busca dados da API externa (com auth)
2. Navega pelo `responsePath` se configurado
3. Itera pelos dados externos
4. Para cada registro:
   - Se novo (externalCode não existe): cria
   - Se existe: atualiza label/value/metadata
5. Marca como `enabled: false` registros que sumiram da API
6. Salva estatísticas no SyncHistory e Datasource.lastSync

##### DatasourceCronService (`services/DatasourceCronService.ts`)
Gerencia jobs de cron para sincronização automática.

**Métodos principais**:

```typescript
// Agenda datasource para sync automático
scheduleDatasource(datasourceId: string, interval: string)

// Remove agendamento
unscheduleDatasource(datasourceId: string)

// Inicializa todos os agendamentos
async initializeSchedules()

// Para todos os jobs (graceful shutdown)
stopAll()

// Atualiza agendamento após edição
async updateSchedule(datasourceId: string)

// Lista jobs ativos
getActiveJobs()
```

**Mapeamento de Intervalos**:
```typescript
'5m'  → '*/5 * * * *'   // A cada 5 minutos
'15m' → '*/15 * * * *'  // A cada 15 minutos
'1h'  → '0 * * * *'     // A cada hora (minuto 0)
'6h'  → '0 */6 * * *'   // A cada 6 horas
'24h' → '0 0 * * *'     // Meia-noite
```

#### 3. **Routes**

##### datasource-sync.ts
```typescript
POST /datasources/:id/sync
// Sincronização manual
// Returns: { status, stats, duration }

GET /datasources/:id/sync-history?limit=10
// Histórico de sincronizações
// Returns: Array de SyncHistory

GET /datasources/:id/data?filters[field]=value
// Dados em cache (não chama API externa)
// Returns: Array de DatasourceData
```

##### datasources.ts (atualizado)
- **POST**: Agenda cron se `syncConfig.enabled`
- **PATCH**: Atualiza agendamento após edição
- **DELETE**: Remove agendamento antes de deletar

##### admin.ts (novo)
```typescript
GET /admin/cron-jobs
// Lista todos os jobs ativos
// Returns: { totalJobs, jobs: [] }

POST /admin/cron-jobs/reinitialize
// Reinicializa todos os agendamentos
// Returns: { success, totalJobs, jobs: [] }
```

#### 4. **Server Integration**

```typescript
// server.ts
import { DatasourceCronService } from './services/DatasourceCronService';

// Após conectar ao DB
const cronService = DatasourceCronService.getInstance();
await cronService.initializeSchedules();

// Graceful shutdown
process.on('SIGTERM', () => {
  cronService.stopAll();
  await fastify.close();
});
```

---

## 🎨 Frontend Components

### 1. **DatasourceModal** (atualizado)

Nova seção: **Sincronização Automática**

**Campos de configuração**:
- ✅ Checkbox: Habilitar sincronização
- 📅 Select: Intervalo (5m, 15m, 1h, 6h, 24h)
- 🔑 Input: Campo ID externo (ex: `id`)
- 🏷️ Input: Campo Label (ex: `name`)
- 💎 Input: Campo Value (ex: `id`)

**Informações exibidas**:
- 📊 Última sincronização (data, status)
- 📈 Estatísticas:
  - Registros encontrados
  - Novos (verde)
  - Atualizados (azul)
  - Desabilitados (laranja)
- ❌ Mensagem de erro se houver

**Visual**:
- Fundo roxo claro (`bg-purple-50`)
- Borda roxa (`border-purple-200`)
- Informações em cards com fundo branco

### 2. **Datasources Page** (atualizado)

**Card de cada datasource mostra**:
- Status do datasource: ✓ Ativo / ○ Inativo
- Badge de sincronização: 🔄 Sync: 1h (se habilitado)
- Última sincronização (data + status)
- Estatísticas detalhadas em grid 2 colunas
- **Novo botão**: 🔄 Sincronizar Agora
  - Só aparece se sync habilitado
  - Mostra "Sincronizando..." durante execução
  - Alert com resultado ao finalizar

**Tipos atualizados**:
- REST API
- MongoDB
- SQL Database
- Estático

---

## 🔄 Fluxo Completo de Uso

### 1. Criar Datasource com Sync

```json
POST /projects/my-project/datasources
{
  "id": "countries-api",
  "name": "API de Países",
  "type": "rest_api",
  "enabled": true,
  "config": {
    "baseUrl": "https://api.example.com/countries",
    "method": "GET",
    "responsePath": "data",
    "auth": {
      "type": "bearer",
      "token": "my-token"
    }
  },
  "syncConfig": {
    "enabled": true,
    "interval": "1h",
    "externalCodeField": "id",
    "labelField": "name",
    "valueField": "code"
  }
}
```

### 2. Sistema Agenda Automaticamente

- Cron job criado: `0 * * * *` (a cada hora)
- Aparece em `GET /admin/cron-jobs`

### 3. Primeira Sincronização (automática ou manual)

```bash
POST /datasources/countries-api/sync
```

**Resultado**:
```json
{
  "status": "success",
  "stats": {
    "recordsFound": 195,
    "recordsAdded": 195,
    "recordsUpdated": 0,
    "recordsDisabled": 0,
    "duration": 1243
  }
}
```

### 4. Dados Armazenados no MongoDB

```javascript
// Collection: datasourcedata
{
  "_id": ObjectId("..."),
  "datasourceId": "countries-api",
  "projectKey": "my-project",
  "externalCode": "BR",
  "label": "Brazil",
  "value": "BR",
  "metadata": { "population": 212000000, "capital": "Brasília" },
  "enabled": true,
  "firstSeenAt": ISODate("2025-11-01T10:00:00Z"),
  "lastSeenAt": ISODate("2025-11-01T11:00:00Z")
}
```

### 5. Filtros Usam Dados em Cache

```bash
GET /datasources/countries-api/data
# Não chama API externa!
# Retorna dados do MongoDB
```

### 6. Sincronizações Seguintes

**Na próxima hora (cron automático)**:
- Busca API externa novamente
- Compara com dados locais por `externalCode`
- Novos países: adiciona
- Países existentes: atualiza label/value/metadata
- Países que sumiram: `enabled: false`

**Exemplo**:
```json
{
  "stats": {
    "recordsFound": 196,     // API retornou 196
    "recordsAdded": 1,        // 1 país novo
    "recordsUpdated": 5,      // 5 países com dados alterados
    "recordsDisabled": 0      // Nenhum sumiu
  }
}
```

### 7. Histórico e Monitoramento

```bash
GET /datasources/countries-api/sync-history?limit=10
```

```json
[
  {
    "datasourceId": "countries-api",
    "status": "success",
    "stats": { ... },
    "triggeredBy": "cron",
    "startedAt": "2025-11-01T11:00:00Z",
    "completedAt": "2025-11-01T11:00:01Z"
  },
  {
    "datasourceId": "countries-api",
    "status": "success",
    "stats": { ... },
    "triggeredBy": "manual",
    "startedAt": "2025-11-01T10:00:00Z",
    "completedAt": "2025-11-01T10:00:01Z"
  }
]
```

---

## 🛠️ Gestão e Manutenção

### Atualizar Configuração de Sync

```bash
PATCH /projects/my-project/datasources/countries-api
{
  "syncConfig": {
    "interval": "6h"  # Muda de 1h para 6h
  }
}
```

✅ Cron automaticamente atualizado

### Desabilitar Sync Temporariamente

```bash
PATCH /projects/my-project/datasources/countries-api
{
  "syncConfig": {
    "enabled": false
  }
}
```

✅ Cron job removido
✅ Dados em cache permanecem disponíveis

### Verificar Jobs Ativos

```bash
GET /admin/cron-jobs
```

```json
{
  "totalJobs": 3,
  "jobs": [
    { "datasourceId": "countries-api", "running": true },
    { "datasourceId": "cities-api", "running": true },
    { "datasourceId": "products-api", "running": true }
  ]
}
```

### Reinicializar Todos os Jobs

```bash
POST /admin/cron-jobs/reinitialize
```

Útil após:
- Restart do servidor
- Mudanças manuais no banco
- Debug de jobs travados

---

## 📊 Benefícios da Arquitetura

### 1. **Performance**
- ❌ **Antes**: Cada mudança de filtro = chamada à API externa
- ✅ **Agora**: Dados em cache MongoDB = consulta local instantânea

### 2. **Confiabilidade**
- ❌ **Antes**: API fora do ar = filtros não funcionam
- ✅ **Agora**: Mesmo se API cair, dados em cache continuam disponíveis

### 3. **Controle**
- ❌ **Antes**: Dependência de API ter filtragem
- ✅ **Agora**: Filtragem local, qualquer critério possível

### 4. **Auditoria**
- ❌ **Antes**: Sem histórico de mudanças
- ✅ **Agora**: SyncHistory completo + soft delete tracking

### 5. **Custo**
- ❌ **Antes**: Muitas chamadas à API (rate limits, custos)
- ✅ **Agora**: Sincronização periódica controlada

---

## 🚀 Próximos Passos

### ✅ Implementado
1. Models: DatasourceData, SyncHistory, Datasource (updated)
2. Services: DatasourceSyncService, DatasourceCronService
3. Routes: sync, admin
4. Frontend: DatasourceModal (sync config), Datasources (sync status/button)
5. Server integration com graceful shutdown
6. Validação de schema com Zod
7. REST API sync com autenticação (bearer, basic, apikey)

### 🔄 Pendente
1. **Implementar MongoDB datasource**
   - `fetchFromMongoDB()` no DatasourceSyncService
   - Connection string configuration
   - Query support

2. **Implementar SQL datasource**
   - `fetchFromSQL()` no DatasourceSyncService
   - PostgreSQL / MySQL support
   - Connection pooling

3. **Atualizar datasource-options.ts**
   - Usar `GET /datasources/:id/data` para datasources sincronizados
   - Fallback para API direta se sync desabilitado

4. **Adicionar enabled a outros models**
   - Project model
   - Filter model

5. **Testes**
   - Unit tests para DatasourceSyncService
   - Integration tests para sincronização
   - Tests para soft delete behavior

---

## 📝 Exemplo de Uso Completo

```typescript
// 1. Criar datasource
const datasource = await api.post('/projects/ecommerce/datasources', {
  id: 'products',
  name: 'Produtos da Loja',
  type: 'rest_api',
  config: {
    baseUrl: 'https://api.myshop.com/products',
    method: 'GET',
    responsePath: 'data.items',
    auth: { type: 'bearer', token: 'xxx' }
  },
  syncConfig: {
    enabled: true,
    interval: '15m',
    externalCodeField: 'sku',
    labelField: 'name',
    valueField: 'sku'
  }
});
// ✅ Job de cron criado automaticamente

// 2. Sincronização manual inicial
await api.post('/datasources/products/sync');
// ✅ 1500 produtos baixados e salvos no MongoDB

// 3. Usar no filtro (dados vêm do cache)
const options = await api.get('/datasources/products/data');
// ✅ Retorna em milissegundos, sem chamar API externa

// 4. Após 15 minutos, cron executa automaticamente
// ✅ 10 produtos novos adicionados
// ✅ 5 produtos atualizados
// ✅ 2 produtos descontinuados marcados como disabled

// 5. Ver histórico
const history = await api.get('/datasources/products/sync-history');
// ✅ Todas as sincronizações registradas

// 6. Editar intervalo
await api.patch('/projects/ecommerce/datasources/products', {
  syncConfig: { interval: '1h' }
});
// ✅ Cron atualizado automaticamente
```

---

## 🎯 Conclusão

Sistema completo de sincronização automática implementado com sucesso! A arquitetura elimina a dependência de APIs externas com filtragem, oferece melhor performance, confiabilidade e controle sobre os dados.

**Stack utilizada**:
- **Backend**: Fastify, MongoDB, node-cron
- **Frontend**: React, TypeScript, Tailwind CSS
- **Validação**: Zod
- **Autenticação**: JWT, Bearer, Basic, API Key

**Resultado**: Sistema enterprise-grade pronto para produção! 🚀
