import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Datasource } from '../models/Datasource';
import { DatasourceCronService } from '../services/DatasourceCronService';

const syncConfigSchema = z.object({
  enabled: z.boolean().default(false),
  interval: z.enum(['5m', '15m', '1h', '6h', '24h']).default('1h'),
  externalCodeField: z.string().optional(),
  labelField: z.string().optional(),
  valueField: z.string().optional()
}).optional();

const CreateDS = z.object({ 
  projectKey: z.string(), 
  id: z.string(), 
  name: z.string(),
  type: z.enum(['rest_api', 'mongodb', 'sql', 'static']), 
  config: z.any().optional(),
  sampleSchema: z.any().optional(),
  enabled: z.boolean().optional().default(true),
  syncConfig: syncConfigSchema
});

export default async function (fastify: FastifyInstance) {
  fastify.get('/projects/:projectKey/datasources', async (request: FastifyRequest<{ Params: { projectKey: string } }>, reply: FastifyReply) => {
    const { projectKey } = request.params;
    const ds = await Datasource.find({ projectKey }).lean();
    return ds;
  });

  fastify.post('/projects/:projectKey/datasources', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateDS.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });
    const d = await Datasource.create(parsed.data as any);
    
    // Schedule cron if sync is enabled
    if (d.enabled && d.syncConfig?.enabled && d.syncConfig.interval) {
      const cronService = DatasourceCronService.getInstance();
      cronService.scheduleDatasource(d.id, d.syncConfig.interval);
    }
    
    return d;
  });

  // patch & delete
  fastify.patch('/projects/:projectKey/datasources/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const updated = await Datasource.findOneAndUpdate({ id }, request.body as any, { new: true });
    
    // Update cron schedule after datasource modification
    if (updated) {
      const cronService = DatasourceCronService.getInstance();
      await cronService.updateSchedule(updated.id);
    }
    
    return updated;
  });

  fastify.delete('/projects/:projectKey/datasources/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    
    // Remove cron schedule before deleting datasource
    const cronService = DatasourceCronService.getInstance();
    cronService.unscheduleDatasource(id);
    
    await Datasource.findOneAndDelete({ id });
    return { ok: true };
  });
}
