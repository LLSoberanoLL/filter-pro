import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { datasourceSyncService } from '../services/DatasourceSyncService';

export default async function (fastify: FastifyInstance) {
  
  /**
   * POST /datasources/:id/sync
   * Força sincronização manual de um datasource
   */
  fastify.post('/datasources/:datasourceId/sync', async (
    request: FastifyRequest<{
      Params: { datasourceId: string }
    }>,
    reply: FastifyReply
  ) => {
    const { datasourceId } = request.params;

    try {
      console.log(`🔄 Sincronização manual iniciada para datasource: ${datasourceId}`);
      
      const result = await datasourceSyncService.syncDatasource(datasourceId, 'manual');

      if (result.status === 'success') {
        return reply.send({
          success: true,
          message: 'Sincronização concluída com sucesso',
          stats: result.stats
        });
      } else {
        return reply.status(500).send({
          success: false,
          error: result.error,
          stats: result.stats
        });
      }
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao sincronizar datasource'
      });
    }
  });

  /**
   * GET /datasources/:id/sync-history
   * Retorna histórico de sincronizações
   */
  fastify.get('/datasources/:datasourceId/sync-history', async (
    request: FastifyRequest<{
      Params: { datasourceId: string }
      Querystring: { limit?: string }
    }>,
    reply: FastifyReply
  ) => {
    const { datasourceId } = request.params;
    const limit = parseInt(request.query.limit || '10');

    try {
      const history = await datasourceSyncService.getSyncHistory(datasourceId, limit);
      return reply.send(history);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Erro ao buscar histórico de sincronização'
      });
    }
  });

  /**
   * GET /datasources/:id/data
   * Retorna dados sincronizados (usa cache local ao invés de chamar API externa)
   */
  fastify.get('/datasources/:datasourceId/data', async (
    request: FastifyRequest<{
      Params: { datasourceId: string }
      Querystring: Record<string, string>
    }>,
    reply: FastifyReply
  ) => {
    const { datasourceId } = request.params;
    const filters = request.query;

    try {
      const data = await datasourceSyncService.getDatasourceData(datasourceId, filters);
      return reply.send(data);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Erro ao buscar dados do datasource'
      });
    }
  });
}
