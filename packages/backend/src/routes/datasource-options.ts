import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Datasource } from '../models/Datasource';
import { DatasourceData } from '../models/DatasourceData';
import { DatasourceSyncService } from '../services/DatasourceSyncService';

export default async function (fastify: FastifyInstance) {
  const syncService = new DatasourceSyncService();

  // Endpoint para buscar opções de um datasource
  fastify.get('/datasources/:datasourceId/options', async (
    request: FastifyRequest<{
      Params: { datasourceId: string }
      Querystring: Record<string, string>
    }>, 
    reply: FastifyReply
  ) => {
    const { datasourceId } = request.params;
    const queryParams = request.query;

    console.log('🔍 Datasource Options Request:', {
      datasourceId,
      queryParams,
      rawUrl: request.url
    });

    try {
      // Buscar datasource no MongoDB
      const datasource = await Datasource.findOne({ id: datasourceId });
      
      if (!datasource) {
        return reply.status(404).send({ error: 'Datasource não encontrado' });
      }

      // ✅ NOVO FLUXO: Usar dados sincronizados da collection datasourcedata
      if (datasource.type === 'rest_api' || datasource.type === 'mongodb' || datasource.type === 'sql') {
        // 1. Verificar se já tem dados sincronizados
        const syncedDataCount = await DatasourceData.countDocuments({
          datasourceId: datasource.id
        });

        console.log('📊 Synced data count:', syncedDataCount);

        // 2. Se não tem dados, fazer sync inicial
        if (syncedDataCount === 0) {
          console.log('🔄 No synced data found, performing initial sync...');
          try {
            await syncService.syncDatasource(datasource.id, 'system');
            console.log('✅ Initial sync completed');
          } catch (error) {
            console.error('❌ Initial sync failed:', error);
            return reply.status(500).send({
              error: 'Erro ao sincronizar dados iniciais',
              details: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // 3. Buscar dados da collection datasourcedata com filtros
        const filters: any = {
          datasourceId: datasource.id
        };

        // Aplicar filtros de dependências de forma GENÉRICA usando mapeamento configurado
        // Os query params contêm os valores dos filtros fonte (ex: ?country=BR)
        // O mapeamento define qual campo usar no metadata (ex: city -> cities)
        const metadataFieldMapping = datasource.syncConfig?.metadataFieldMapping || {};
        
        Object.entries(queryParams).forEach(([paramKey, paramValue]) => {
          if (paramValue) {
            // Verificar se há um mapeamento configurado para este campo
            // Se sim, usar o campo mapeado. Se não, usar o próprio paramKey
            const metadataField = metadataFieldMapping[paramKey] || paramKey;
            
            // MongoDB automaticamente busca dentro de arrays se o campo for um array
            filters[`metadata.${metadataField}`] = paramValue;
            
            console.log(`🗺️  Mapping: ?${paramKey}=${paramValue} → metadata.${metadataField}`);
          }
        });

        console.log('🔍 Querying datasourcedata with filters:', filters);

        const data = await DatasourceData.find(filters).lean();

        console.log('✅ Found', data.length, 'records from datasourcedata');

        // 4. Retornar no formato esperado pelos filtros
        // Cada registro tem { externalCode, label, value, metadata }
        return data.map(record => ({
          id: record.externalCode,
          label: record.label,
          value: record.value,
          ...record.metadata // Inclui campos adicionais
        }));
      }

      // Se for estático, retornar as opções configuradas
      if (datasource.type === 'static' && datasource.config?.options) {
        return datasource.config.options;
      }

      return reply.status(400).send({ error: 'Tipo de datasource não suportado' });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ 
        error: 'Erro ao buscar opções do datasource',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}
