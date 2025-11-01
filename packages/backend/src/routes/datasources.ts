import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Datasource } from '../models/Datasource';

const CreateDS = z.object({ 
  projectKey: z.string(), 
  id: z.string(), 
  name: z.string(),
  type: z.string(), 
  config: z.any().optional(),
  sampleSchema: z.any().optional()
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
    return d;
  });

  // patch & delete
  fastify.patch('/projects/:projectKey/datasources/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const updated = await Datasource.findOneAndUpdate({ id }, request.body as any, { new: true });
    return updated;
  });

  fastify.delete('/projects/:projectKey/datasources/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    await Datasource.findOneAndDelete({ id });
    return { ok: true };
  });
}
