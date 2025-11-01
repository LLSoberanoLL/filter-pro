import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Project } from '../models/Project';

const CreateProject = z.object({ projectKey: z.string().min(1), name: z.string().min(1), metadata: z.any().optional() });

export default async function (fastify: FastifyInstance) {
  fastify.get('/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const projects = await Project.find().lean();
    return projects;
  });

  fastify.post('/projects', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = CreateProject.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.errors });
    const p = await Project.create(parsed.data as any);
    return p;
  });

  fastify.get('/projects/:projectKey', async (request: FastifyRequest<{ Params: { projectKey: string } }>, reply: FastifyReply) => {
    const { projectKey } = request.params;
    const p = await Project.findOne({ projectKey }).lean();
    if (!p) return reply.status(404).send({ error: 'Not found' });
    return p;
  });
}
