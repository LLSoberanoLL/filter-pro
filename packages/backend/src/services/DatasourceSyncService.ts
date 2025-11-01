import { Datasource } from '../models/Datasource';
import { DatasourceData } from '../models/DatasourceData';
import { SyncHistory } from '../models/SyncHistory';

interface SyncResult {
  status: 'success' | 'error';
  stats: {
    recordsFound: number;
    recordsAdded: number;
    recordsUpdated: number;
    recordsDisabled: number;
    duration: number;
  };
  error?: string;
}

/**
 * Serviço responsável por sincronizar dados de datasources externos
 */
export class DatasourceSyncService {
  /**
   * Sincroniza um datasource específico
   */
  async syncDatasource(datasourceId: string, triggeredBy: 'cron' | 'manual' | 'system' = 'manual'): Promise<SyncResult> {
    const startTime = Date.now();
    let history: any = null;
    
    try {
      console.log(`[SYNC] Iniciando sincronização: ${datasourceId}, triggeredBy: ${triggeredBy}`);
      
      // Buscar datasource primeiro para obter o projectKey
      const datasource = await Datasource.findOne({ id: datasourceId });
      console.log(`[SYNC] Datasource encontrado:`, datasource ? { id: datasource.id, projectKey: datasource.projectKey, enabled: datasource.enabled } : 'null');
      
      if (!datasource) {
        throw new Error('Datasource não encontrado');
      }

      if (!datasource.enabled) {
        throw new Error('Datasource está desabilitado');
      }

      console.log(`[SYNC] Criando SyncHistory com projectKey: ${datasource.projectKey}`);
      
      // Criar registro de histórico com projectKey
      history = await SyncHistory.create({
        datasourceId,
        projectKey: datasource.projectKey,
        status: 'in_progress',
        triggeredBy,
        startedAt: new Date()
      });
      
      console.log(`[SYNC] SyncHistory criado:`, history._id);

      // Buscar dados da fonte externa
      const externalData = await this.fetchExternalData(datasource);
      
      // Processar e salvar dados
      const stats = await this.processData(datasource, externalData);
      
      const duration = Date.now() - startTime;

      // Atualizar histórico
      await SyncHistory.findByIdAndUpdate(history._id, {
        status: 'success',
        stats: { ...stats, duration },
        completedAt: new Date()
      });

      // Atualizar datasource
      await Datasource.findOneAndUpdate(
        { id: datasourceId },
        {
          'lastSync.date': new Date(),
          'lastSync.status': 'success',
          'lastSync.recordsAdded': stats.recordsAdded,
          'lastSync.recordsUpdated': stats.recordsUpdated,
          'lastSync.recordsDisabled': stats.recordsDisabled
        }
      );

      return {
        status: 'success',
        stats: { ...stats, duration }
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      console.error(`[SYNC] Erro na sincronização:`, error);

      // Atualizar histórico (se foi criado)
      if (history) {
        await SyncHistory.findByIdAndUpdate(history._id, {
          status: 'error',
          error: errorMessage,
          stats: { duration },
          completedAt: new Date()
        });
      }

      // Atualizar datasource
      await Datasource.findOneAndUpdate(
        { id: datasourceId },
        {
          'lastSync.date': new Date(),
          'lastSync.status': 'error',
          'lastSync.error': errorMessage
        }
      );

      return {
        status: 'error',
        stats: {
          recordsFound: 0,
          recordsAdded: 0,
          recordsUpdated: 0,
          recordsDisabled: 0,
          duration
        },
        error: errorMessage
      };
    }
  }

  /**
   * Busca dados da fonte externa (REST API, MongoDB, SQL)
   */
  private async fetchExternalData(datasource: any): Promise<any[]> {
    switch (datasource.type) {
      case 'rest_api':
        return await this.fetchFromRestApi(datasource);
      
      case 'mongodb':
        return await this.fetchFromMongoDB(datasource);
      
      case 'sql':
        return await this.fetchFromSQL(datasource);
      
      case 'static':
        return datasource.config?.options || [];
      
      default:
        throw new Error(`Tipo de datasource não suportado: ${datasource.type}`);
    }
  }

  /**
   * Busca dados de uma REST API
   */
  private async fetchFromRestApi(datasource: any): Promise<any[]> {
    const { baseUrl, method = 'GET', headers = {}, auth } = datasource.config;
    
    // Construir headers
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers
    };

    // Adicionar autenticação
    if (auth?.type === 'bearer' && auth.token) {
      fetchHeaders['Authorization'] = `Bearer ${auth.token}`;
    } else if (auth?.type === 'apikey' && auth.apiKey) {
      const headerName = auth.apiKeyHeader || 'X-API-Key';
      fetchHeaders[headerName] = auth.apiKey;
    } else if (auth?.type === 'basic' && auth.username && auth.password) {
      const credentials = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      fetchHeaders['Authorization'] = `Basic ${credentials}`;
    }

    try {
      const response = await fetch(baseUrl, {
        method,
        headers: fetchHeaders
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();

      // Navegar pelo responsePath se especificado
      if (datasource.config.responsePath) {
        const paths = datasource.config.responsePath.split('.');
        for (const path of paths) {
          if (data && typeof data === 'object') {
            data = data[path];
          }
        }
      }

      return Array.isArray(data) ? data : [data];
    } catch (error) {
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        throw new Error(`Não foi possível conectar em ${baseUrl}. Dica: Se estiver usando localhost dentro do Docker, use host.docker.internal:4000 ao invés de localhost:4000`);
      }
      throw error;
    }
  }

  /**
   * Busca dados de um MongoDB externo
   */
  private async fetchFromMongoDB(datasource: any): Promise<any[]> {
    const { connectionString, database, collection, query = {}, projection = {} } = datasource.config;
    
    if (!connectionString || !database || !collection) {
      throw new Error('Configuração incompleta: connectionString, database e collection são obrigatórios');
    }

    // Importar MongoDB driver dinamicamente
    const { MongoClient } = await import('mongodb');
    
    let client: any = null;
    
    try {
      // Conectar ao MongoDB externo
      client = new MongoClient(connectionString);
      await client.connect();
      
      console.log('✅ Conectado ao MongoDB externo:', database);
      
      // Acessar database e collection
      const db = client.db(database);
      const coll = db.collection(collection);
      
      // Executar query
      const data = await coll.find(query, { projection }).toArray();
      
      console.log(`✅ Encontrados ${data.length} documentos`);
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar dados do MongoDB externo:', error);
      throw new Error(`Erro ao conectar no MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Fechar conexão
      if (client) {
        await client.close();
      }
    }
  }

  /**
   * Busca dados de um banco SQL externo
   */
  private async fetchFromSQL(datasource: any): Promise<any[]> {
    const { engine, host, port, database, username, password, query } = datasource.config;
    
    if (!engine || !host || !database || !username || !query) {
      throw new Error('Configuração incompleta: engine, host, database, username e query são obrigatórios');
    }

    // Suporte a PostgreSQL e MySQL
    if (engine === 'postgresql') {
      return await this.fetchFromPostgreSQL(datasource.config);
    } else if (engine === 'mysql') {
      return await this.fetchFromMySQL(datasource.config);
    } else {
      throw new Error(`Engine SQL não suportado: ${engine}. Use 'postgresql' ou 'mysql'`);
    }
  }

  /**
   * Busca dados de PostgreSQL
   */
  private async fetchFromPostgreSQL(config: any): Promise<any[]> {
    const { Client } = await import('pg');
    const { host, port = 5432, database, username, password, query } = config;
    
    const client = new Client({
      host,
      port,
      database,
      user: username,
      password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false
    });

    try {
      await client.connect();
      console.log('✅ Conectado ao PostgreSQL:', database);
      
      const result = await client.query(query);
      console.log(`✅ Encontradas ${result.rows.length} linhas`);
      
      return result.rows;
    } catch (error) {
      console.error('❌ Erro ao buscar dados do PostgreSQL:', error);
      throw new Error(`Erro no PostgreSQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      await client.end();
    }
  }

  /**
   * Busca dados de MySQL
   */
  private async fetchFromMySQL(config: any): Promise<any[]> {
    const mysql = await import('mysql2/promise');
    const { host, port = 3306, database, username, password, query } = config;
    
    let connection: any = null;

    try {
      connection = await mysql.createConnection({
        host,
        port,
        database,
        user: username,
        password,
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined
      });

      console.log('✅ Conectado ao MySQL:', database);
      
      const [rows] = await connection.execute(query);
      console.log(`✅ Encontradas ${Array.isArray(rows) ? rows.length : 0} linhas`);
      
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      console.error('❌ Erro ao buscar dados do MySQL:', error);
      throw new Error(`Erro no MySQL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Processa os dados externos e atualiza o banco local
   */
  private async processData(datasource: any, externalData: any[]): Promise<{
    recordsFound: number;
    recordsAdded: number;
    recordsUpdated: number;
    recordsDisabled: number;
  }> {
    const { externalCodeField, labelField = 'label', valueField = 'value' } = datasource.syncConfig || {};
    
    if (!externalCodeField) {
      throw new Error('Campo externalCode não configurado');
    }

    const stats = {
      recordsFound: externalData.length,
      recordsAdded: 0,
      recordsUpdated: 0,
      recordsDisabled: 0
    };

    // Coletar códigos externos que vieram da API
    const externalCodes = new Set<string>();

    console.log('[PROCESS] Processing data:', {
      datasourceId: datasource.id,
      projectKey: datasource.projectKey,
      externalDataCount: externalData.length,
      externalCodeField,
      labelField,
      valueField,
      firstItem: externalData[0]
    });

    // Processar cada registro
    for (const item of externalData) {
      const externalCode = String(item[externalCodeField]);
      const label = String(item[labelField] || externalCode);
      const value = String(item[valueField] || externalCode);

      console.log('[PROCESS] Processing item:', { externalCode, label, value, metadata: item });

      externalCodes.add(externalCode);

      // Buscar registro existente
      const existing = await DatasourceData.findOne({
        datasourceId: datasource.id,
        externalCode
      });

      console.log('[PROCESS] Existing record:', existing ? 'FOUND' : 'NOT FOUND');

      if (existing) {
        // Atualizar registro existente
        const updated = await DatasourceData.findByIdAndUpdate(
          existing._id,
          {
            label,
            value,
            metadata: item,
            lastSeenAt: new Date(),
            enabled: true, // Reativar se estava desabilitado
            $unset: { disabledAt: 1 }
          },
          { new: true }
        );

        if (updated) {
          stats.recordsUpdated++;
        }
      } else {
        // Criar novo registro
        await DatasourceData.create({
          datasourceId: datasource.id,
          projectKey: datasource.projectKey,
          externalCode,
          label,
          value,
          metadata: item,
          enabled: true,
          firstSeenAt: new Date(),
          lastSeenAt: new Date()
        });

        stats.recordsAdded++;
      }
    }

    // Desabilitar registros que não vieram mais da API
    const result = await DatasourceData.updateMany(
      {
        datasourceId: datasource.id,
        externalCode: { $nin: Array.from(externalCodes) },
        enabled: true
      },
      {
        enabled: false,
        disabledAt: new Date()
      }
    );

    stats.recordsDisabled = result.modifiedCount || 0;

    return stats;
  }

  /**
   * Busca dados sincronizados de um datasource
   */
  async getDatasourceData(datasourceId: string, filters?: any): Promise<any[]> {
    const query: any = {
      datasourceId
    };

    // Adicionar filtros adicionais se fornecidos
    if (filters) {
      Object.assign(query, filters);
    }

    const data = await DatasourceData.find(query)
      .sort({ label: 1 })
      .lean();

    return data.map(item => ({
      label: item.label,
      value: item.value,
      externalCode: item.externalCode,
      metadata: item.metadata
    }));
  }

  /**
   * Obtém histórico de sincronizações
   */
  async getSyncHistory(datasourceId: string, limit: number = 10): Promise<any[]> {
    return await SyncHistory.find({ datasourceId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

export const datasourceSyncService = new DatasourceSyncService();
