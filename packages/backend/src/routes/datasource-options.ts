import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Datasource } from '../models/Datasource';

export default async function (fastify: FastifyInstance) {
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

      // Se for REST API, fazer a requisição
      if (datasource.type === 'rest_api' && datasource.config?.baseUrl) {
        const { baseUrl, method = 'GET', headers = {}, auth, queryParams: configParams = {} } = datasource.config;
        
        // Mesclar query params configurados com os da requisição
        // Os params da requisição têm prioridade
        const mergedParams: Record<string, string> = { ...configParams };
        
        // Substituir templates nos params configurados com valores da requisição
        Object.entries(mergedParams).forEach(([key, value]) => {
          if (typeof value === 'string' && value.includes('{{') && value.includes('}}')) {
            // Substituir {{field}} pelo valor do query param correspondente
            let resolvedValue = value;
            let hasUnresolvedTemplates = false;
            
            Object.entries(queryParams).forEach(([paramKey, paramValue]) => {
              resolvedValue = resolvedValue.replace(`{{${paramKey}}}`, paramValue);
            });
            
            // Se ainda tem templates não resolvidos, remover o parâmetro
            if (resolvedValue.includes('{{') && resolvedValue.includes('}}')) {
              hasUnresolvedTemplates = true;
              delete mergedParams[key];
            } else {
              mergedParams[key] = resolvedValue;
            }
            
            console.log('🔄 Template resolution:', { key, originalValue: value, resolvedValue, hasUnresolvedTemplates });
          }
        });
        
        console.log('🔧 Merged Params:', {
          configParams,
          requestParams: queryParams,
          mergedParams
        });
        
        // Se a URL for localhost, substituir pelo hostname do container
        let finalUrl = baseUrl;
        if (baseUrl.includes('localhost:4000') || baseUrl.includes('127.0.0.1:4000')) {
          // Dentro do Docker, usar o próprio servidor (requisição interna)
          finalUrl = baseUrl.replace('http://localhost:4000', '').replace('http://127.0.0.1:4000', '');
          // Se começar com /, é uma rota local
          if (finalUrl.startsWith('/')) {
            // Fazer requisição para si mesmo
            const localUrl = `http://localhost:4000${finalUrl}`;
            const url = new URL(localUrl);
            Object.entries(mergedParams).forEach(([key, value]) => {
              if (value) {
                url.searchParams.set(key, value);
              }
            });
            
            // Fazer requisição interna usando fastify.inject (mais eficiente)
            console.log('🔄 Internal Request:', {
              method,
              url: url.pathname + url.search,
              originalBaseUrl: baseUrl,
              mergedParams
            });
            
            const internalResponse = await fastify.inject({
              method: method as any,
              url: url.pathname + url.search,
              headers: headers as any
            });
            
            const result = JSON.parse(internalResponse.body);
            console.log('✅ Internal Response:', result);
            
            return result;
          }
        }
        
        // Construir URL com query params
        const url = new URL(finalUrl);
        Object.entries(mergedParams).forEach(([key, value]) => {
          if (value) {
            url.searchParams.set(key, value);
          }
        });

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

        // Fazer requisição
        const response = await fetch(url.toString(), {
          method: method,
          headers: fetchHeaders
        });

        if (!response.ok) {
          return reply.status(response.status).send({ 
            error: `Erro ao buscar dados: ${response.statusText}` 
          });
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

        return data;
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
