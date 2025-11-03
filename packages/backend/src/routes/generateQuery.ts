import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Filter } from '../models/Filter';

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
    
    // Buscar todos os filtros do projeto para obter queryKey
    const filterConfigs = await Filter.find({ projectKey }).lean();
    const filterMap = new Map(filterConfigs.map(f => [f.slug, f]));
    
    // Convert filters to MongoDB query
    for (const [key, value] of Object.entries(filters || {})) {
      if (value == null || value === '') continue;
      
      // Usar queryKey se disponível, senão usar o slug
      const filterConfig = filterMap.get(key);
      const queryKey = filterConfig?.queryKey || key;
      
      // Handle arrays -> $in
      if (Array.isArray(value)) {
        query[queryKey] = { $in: value };
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
          query[queryKey] = rangeQuery;
        }
      }
      // Handle simple values
      else {
        query[queryKey] = value;
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
