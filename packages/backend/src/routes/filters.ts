import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Filter } from '../models/Filter';

const CreateFilter = z.object({ projectKey: z.string(), name: z.string(), slug: z.string(), type: z.string() });

export default async function (fastify: FastifyInstance) {
  fastify.get('/projects/:projectKey/filters', async (request: FastifyRequest<{ Params: { projectKey: string } }>, reply: FastifyReply) => {
    const { projectKey } = request.params;
    const filters = await Filter.find({ projectKey }).lean();
    return filters;
  });

  fastify.post('/projects/:projectKey/filters', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateFilter.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });
    const f = await Filter.create(parsed.data as any);
    return f;
  });

  fastify.get('/projects/:projectKey/filters/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const f = await Filter.findById(id).lean();
    if (!f) return reply.status(404).send({ error: 'Not found' });
    return f;
  });

  fastify.patch('/projects/:projectKey/filters/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const updated = await Filter.findByIdAndUpdate(id, request.body as any, { new: true });
    return updated;
  });

  fastify.delete('/projects/:projectKey/filters/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    await Filter.findByIdAndDelete(id);
    return { ok: true };
  });

  fastify.post('/projects/:projectKey/filters/:id/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    // For demo, just echo validation
    return { valid: true, example: request.body };
  });
}
