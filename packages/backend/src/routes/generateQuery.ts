import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

const GenerateSchema = z.object({ 
  filters: z.record(z.any()),
  options: z.object({
    format: z.string().optional()
  }).optional()
});

interface GenerateQueryParams {
  projectKey: string;
}

export default async function (fastify: FastifyInstance) {
  fastify.post('/projects/:projectKey/generate-query', async (
    request: FastifyRequest<{ Params: GenerateQueryParams }>, 
    reply: FastifyReply
  ) => {
    const { projectKey } = request.params;
    const parsed = GenerateSchema.safeParse(request.body);
    
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.errors });
    }
    
    const { filters, options } = parsed.data;
    const query: any = {};
    
    // Convert filters to MongoDB query
    for (const [key, value] of Object.entries(filters || {})) {
      if (value == null || value === '') continue;
      
      // Handle arrays -> $in
      if (Array.isArray(value)) {
        query[key] = { $in: value };
      }
      // Handle range objects with from/to -> $gte/$lte
      else if (typeof value === 'object' && value !== null && ('from' in value || 'to' in value)) {
        const rangeQuery: any = {};
        if ('from' in value && value.from != null && value.from !== '') {
          rangeQuery.$gte = value.from;
        }
        if ('to' in value && value.to != null && value.to !== '') {
          rangeQuery.$lte = value.to;
        }
        if (Object.keys(rangeQuery).length > 0) {
          query[key] = rangeQuery;
        }
      }
      // Handle simple values
      else {
        query[key] = value;
      }
    }
    
    return { 
      query, 
      projectKey,
      format: options?.format || 'mongodb',
      human: `Generated ${options?.format || 'MongoDB'} query for project "${projectKey}"`
    };
  });
}
