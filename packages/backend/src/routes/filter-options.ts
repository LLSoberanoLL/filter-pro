import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Filter } from '../models/Filter';
import { DatasourceData } from '../models/DatasourceData';

interface FilterOptionsRequest {
  Params: {
    projectKey: string;
    filterSlug: string;
  };
  Querystring: Record<string, string>; // Parâmetros de outros filtros (ex: ?country=BR)
}

export default async function (fastify: FastifyInstance) {
  /**
   * GET /projects/:projectKey/filters/:filterSlug/options
   * 
   * Retorna as opções de um filtro, aplicando filtragem baseada em dependências
   * Query params: valores de outros filtros que afetam este filtro
   */
  fastify.get(
    '/projects/:projectKey/filters/:filterSlug/options',
    async (request: FastifyRequest<FilterOptionsRequest>, reply: FastifyReply) => {
      const { projectKey, filterSlug } = request.params;
      const queryParams = request.query;

      console.log('[FILTER-OPTIONS] Buscando opções para filtro:', filterSlug);
      console.log('[FILTER-OPTIONS] Query params recebidos:', queryParams);

      try {
        // 1. Buscar configuração do filtro
        const filter = await Filter.findOne({ projectKey, slug: filterSlug }).lean();
        
        if (!filter) {
          return reply.status(404).send({ error: 'Filter not found' });
        }

        console.log('[FILTER-OPTIONS] Filtro encontrado:', {
          id: filter._id,
          name: filter.name,
          datasource: filter.dataSource,
          optionsConfig: filter.optionsConfig,
          dependencies: filter.dependencies
        });

        // 2. Identificar o datasourceId (pode estar em vários lugares)
        let datasourceId: string | undefined;
        
        // Opção 1: dataSource como string direta
        if (typeof filter.dataSource === 'string') {
          datasourceId = filter.dataSource;
        }
        // Opção 2: dataSource.datasourceId
        else if (filter.dataSource && typeof filter.dataSource === 'object' && 'datasourceId' in filter.dataSource) {
          datasourceId = (filter.dataSource as any).datasourceId;
        }
        // Opção 3: optionsConfig.dynamic.datasourceId (estrutura antiga)
        else if (filter.optionsConfig?.dynamic?.datasourceId) {
          datasourceId = filter.optionsConfig.dynamic.datasourceId;
        }

        console.log('[FILTER-OPTIONS] DatasourceId resolvido:', datasourceId);

        if (!datasourceId) {
          return reply.status(400).send({ error: 'Filter has no datasource configured' });
        }

        // 3. Construir query base
        const query: any = { datasourceId };

        // 4. Aplicar filtros baseados em dependências
        if (queryParams && Object.keys(queryParams).length > 0) {
          console.log('[FILTER-OPTIONS] Aplicando filtros de dependência...');

          // Para cada parâmetro recebido, verificar se há dependência configurada
          for (const [paramKey, paramValue] of Object.entries(queryParams)) {
            console.log(`[FILTER-OPTIONS] Processando parâmetro: ${paramKey} = ${paramValue}`);

            // Buscar dependência que corresponde a este parâmetro
            // O paramKey deve ser o slug do filtro que está afetando este filtro
            const dependency = filter.dependencies?.find((dep: any) => 
              dep.filterSlug === paramKey && dep.mode === 'affected-by'
            );

            if (dependency) {
              console.log('[FILTER-OPTIONS] Dependência encontrada:', dependency);

              // Buscar o valor selecionado no filtro que está afetando
              const affectingFilter = await Filter.findOne({ 
                projectKey, 
                slug: paramKey 
              }).lean();

              if (!affectingFilter) {
                console.log(`[FILTER-OPTIONS] Filtro afetante '${paramKey}' não encontrado`);
                continue;
              }

              // Buscar datasourceId do filtro afetante
              let affectingDatasourceId: string | undefined;
              
              if (typeof affectingFilter.dataSource === 'string') {
                affectingDatasourceId = affectingFilter.dataSource;
              } else if (affectingFilter.dataSource && typeof affectingFilter.dataSource === 'object' && 'datasourceId' in affectingFilter.dataSource) {
                affectingDatasourceId = (affectingFilter.dataSource as any).datasourceId;
              } else if (affectingFilter.optionsConfig?.dynamic?.datasourceId) {
                affectingDatasourceId = affectingFilter.optionsConfig.dynamic.datasourceId;
              }

              console.log(`[FILTER-OPTIONS] DatasourceId do filtro afetante '${paramKey}':`, affectingDatasourceId);

              // Buscar o registro do filtro afetante para pegar seus dados/metadata
              const affectingData = await DatasourceData.findOne({
                datasourceId: affectingDatasourceId,
                value: paramValue
              }).lean();

              if (!affectingData) {
                console.log(`[FILTER-OPTIONS] Dados do filtro afetante não encontrados para value='${paramValue}'`);
                continue;
              }

              console.log('[FILTER-OPTIONS] Dados do filtro afetante:', affectingData);

              // Aplicar mapeamento da dependência
              const { mapping } = dependency;

              // Cenário 1: myField <- targetField (ex: country.value <- city.metadata.country)
              // O filtro afetante tem um campo que deve filtrar meu campo direto
              if (mapping.myField && mapping.targetMetadataField) {
                const targetValue = affectingData.metadata?.[mapping.targetMetadataField];
                if (targetValue !== undefined) {
                  query[mapping.myField] = targetValue;
                  console.log(`[FILTER-OPTIONS] Aplicando filtro: ${mapping.myField} = ${targetValue}`);
                }
              }

              // Cenário 2: myMetadataField <- targetField (ex: city.metadata.country <- country.value)
              // O filtro afetante tem um value que deve filtrar meu metadata
              if (mapping.myMetadataField && mapping.targetField) {
                const targetValue = affectingData[mapping.targetField];
                if (targetValue !== undefined) {
                  query[`metadata.${mapping.myMetadataField}`] = targetValue;
                  console.log(`[FILTER-OPTIONS] Aplicando filtro: metadata.${mapping.myMetadataField} = ${targetValue}`);
                }
              }

              // Cenário 3: myMetadataField <- targetMetadataField
              if (mapping.myMetadataField && mapping.targetMetadataField) {
                const targetValue = affectingData.metadata?.[mapping.targetMetadataField];
                if (targetValue !== undefined) {
                  query[`metadata.${mapping.myMetadataField}`] = targetValue;
                  console.log(`[FILTER-OPTIONS] Aplicando filtro: metadata.${mapping.myMetadataField} = ${targetValue}`);
                }
              }

              // Cenário 4: myField <- targetMetadataField
              if (mapping.myField && mapping.targetMetadataField) {
                const targetValue = affectingData.metadata?.[mapping.targetMetadataField];
                if (targetValue !== undefined) {
                  query[mapping.myField] = targetValue;
                  console.log(`[FILTER-OPTIONS] Aplicando filtro: ${mapping.myField} = ${targetValue}`);
                }
              }
            } else {
              console.log(`[FILTER-OPTIONS] Nenhuma dependência configurada para parâmetro '${paramKey}'`);
            }
          }
        }

        console.log('[FILTER-OPTIONS] Query final para DatasourceData:', query);

        // 5. Buscar dados no datasourcedata
        const options = await DatasourceData.find(query)
          .select('value label metadata')
          .lean();

        console.log(`[FILTER-OPTIONS] ${options.length} opções encontradas`);

        // 6. Formatar resposta
        const formattedOptions = options.map(opt => ({
          value: opt.value,
          label: opt.label,
          metadata: opt.metadata
        }));

        return formattedOptions;

      } catch (error) {
        console.error('[FILTER-OPTIONS] Erro ao buscar opções:', error);
        return reply.status(500).send({ 
          error: 'Error fetching filter options',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
}
