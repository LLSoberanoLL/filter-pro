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
            // paramValue pode ser um array (multiselect) ou string (select simples)
            const isMultiValue = paramValue.includes(',')
            const values = isMultiValue ? paramValue.split(',') : [paramValue]
            
            console.log(`[FILTER-OPTIONS] Processando parâmetro: ${paramKey} = ${paramValue} (${values.length} valores)`);

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

              // Buscar os registros do filtro afetante para pegar seus dados/metadata
              // Suporta múltiplos valores (multiselect)
              const affectingDataList = await DatasourceData.find({
                datasourceId: affectingDatasourceId,
                value: { $in: values }
              }).lean();

              if (!affectingDataList || affectingDataList.length === 0) {
                console.log(`[FILTER-OPTIONS] Dados do filtro afetante não encontrados para values=${values.join(',')}`);
                continue;
              }

              console.log(`[FILTER-OPTIONS] ${affectingDataList.length} registros do filtro afetante encontrados`);

              // Aplicar mapeamento da dependência
              const mapping = dependency.mapping;
              
              if (!mapping) {
                console.log('[FILTER-OPTIONS] Dependência sem mapeamento configurado');
                continue;
              }

              // Validação: usuário não pode preencher ambos os campos "my" e "target" simultaneamente
              const hasMyField = !!mapping.myField;
              const hasMyMetadata = !!mapping.myMetadataField;
              const hasTargetField = !!mapping.targetField;
              const hasTargetMetadata = !!mapping.targetMetadataField;

              const myFieldsCount = (hasMyField ? 1 : 0) + (hasMyMetadata ? 1 : 0);
              const targetFieldsCount = (hasTargetField ? 1 : 0) + (hasTargetMetadata ? 1 : 0);

              if (myFieldsCount === 0 || targetFieldsCount === 0) {
                console.log(`[FILTER-OPTIONS] Mapeamento inválido: deve ter exatamente 1 campo "my" e 1 campo "target". Atual: ${myFieldsCount} my, ${targetFieldsCount} target`);
                continue;
              }

              if (myFieldsCount > 1) {
                console.log(`[FILTER-OPTIONS] Mapeamento inválido: preencha apenas UM campo "my" (myField OU myMetadataField), não ambos.`);
                continue;
              }

              if (targetFieldsCount > 1) {
                console.log(`[FILTER-OPTIONS] Mapeamento inválido: preencha apenas UM campo "target" (targetField OU targetMetadataField), não ambos.`);
                continue;
              }

              // Agora sabemos que há exatamente 1 campo "my" e 1 campo "target"
              // Determinar qual combinação válida foi usada e aplicar o filtro
              // Suporta múltiplos valores (multiselect)

              let targetValues: any[] = [];
              let queryKey: string;
              let sourceDesc: string;
              let targetDesc: string;

              // Determinar de onde vem o valor (target) - coletar de todos os registros
              if (hasTargetField && mapping.targetField) {
                targetValues = affectingDataList.map((data: any) => data[mapping.targetField]).filter(v => v !== undefined);
                sourceDesc = mapping.targetField;
              } else if (mapping.targetMetadataField) {
                targetValues = affectingDataList.map((data: any) => data.metadata?.[mapping.targetMetadataField]).filter(v => v !== undefined);
                sourceDesc = `metadata.${mapping.targetMetadataField}`;
              } else {
                console.log(`[FILTER-OPTIONS] Mapeamento de target inválido`);
                continue;
              }

              // Determinar para onde vai o valor (my)
              if (hasMyField && mapping.myField) {
                queryKey = mapping.myField;
                targetDesc = mapping.myField;
              } else if (mapping.myMetadataField) {
                queryKey = `metadata.${mapping.myMetadataField}`;
                targetDesc = `metadata.${mapping.myMetadataField}`;
              } else {
                console.log(`[FILTER-OPTIONS] Mapeamento de my inválido`);
                continue;
              }

              if (targetValues.length > 0) {
                // Se houver múltiplos valores, usar $in
                if (targetValues.length > 1) {
                  query[queryKey] = { $in: targetValues };
                  console.log(`[FILTER-OPTIONS] Aplicando filtro: ${targetDesc} IN [${targetValues.join(', ')}] (de ${sourceDesc})`);
                } else {
                  query[queryKey] = targetValues[0];
                  console.log(`[FILTER-OPTIONS] Aplicando filtro: ${targetDesc} = ${JSON.stringify(targetValues[0])} (de ${sourceDesc})`);
                }
              } else {
                console.log(`[FILTER-OPTIONS] Nenhum valor encontrado no filtro afetante para mapeamento`);
              }
            } else {
              console.log(`[FILTER-OPTIONS] Nenhuma dependência configurada para parâmetro '${paramKey}'`);
            }
          }
        }

        console.log('[FILTER-OPTIONS] Query final para DatasourceData:', JSON.stringify(query, null, 2));

        // 5. Buscar dados no datasourcedata
        const options = await DatasourceData.find(query)
          .select('value label metadata')
          .lean();

        console.log(`[FILTER-OPTIONS] ${options.length} opções encontradas`);
        if (options.length > 0 && options.length <= 5) {
          console.log('[FILTER-OPTIONS] Primeiras opções encontradas:', JSON.stringify(options, null, 2));
        }

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
