import { useState, useEffect } from 'react'
import { Button } from '../ui/button'
import { useApi } from '../../hooks/useApi'

interface Datasource {
  _id: string
  id: string
  name: string
  type: 'rest_api' | 'graphql' | 'database'
  config: {
    baseUrl?: string
    method?: string
  }
  sampleSchema?: Record<string, any>
}

interface Filter {
  _id?: string
  projectKey: string
  slug: string
  name: string
  type: 'select' | 'range' | 'text'
  active: boolean
  order: number
  dependencies: Array<{
    sourceFilterId: string
    type: 'restrictOptions' | 'conditionalShow'
  }>
  optionsConfig?: {
    static?: Array<{ label: string; value: string }>
    dynamic?: {
      datasourceId: string
      template: Record<string, string>
    }
  }
  uiConfig?: {
    mode?: string
    placeholder?: string
  }
}

interface FilterFormData {
  projectKey: string
  slug: string
  name: string
  type: 'select' | 'range' | 'text'
  active: boolean
  order: number
  dependencies: Array<{
    sourceFilterId: string
    type: 'restrictOptions' | 'conditionalShow'
  }>
  optionsConfig?: {
    static?: Array<{ label: string; value: string }>
    dynamic?: {
      datasourceId: string
      template: Record<string, string>
    }
  }
  uiConfig?: {
    mode?: string
    placeholder?: string
  }
}

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (filter: FilterFormData) => Promise<void>
  filter?: Filter
  title: string
  projectKey: string
  existingFilters: Filter[]
}

export function FilterModal({ 
  isOpen, 
  onClose, 
  onSave, 
  filter, 
  title, 
  projectKey,
  existingFilters 
}: FilterModalProps) {
  const { get } = useApi()
  
  const [formData, setFormData] = useState<FilterFormData>({
    projectKey,
    slug: filter?.slug || '',
    name: filter?.name || '',
    type: filter?.type || 'select',
    active: filter?.active ?? true,
    order: filter?.order ?? Math.max(0, ...existingFilters.map(f => f.order)) + 1,
    dependencies: filter?.dependencies || [],
    optionsConfig: filter?.optionsConfig || {},
    uiConfig: filter?.uiConfig || {},
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [optionsSource, setOptionsSource] = useState<'static' | 'dynamic'>(
    filter?.optionsConfig?.dynamic ? 'dynamic' : 'static'
  )
  const [staticOptions, setStaticOptions] = useState<Array<{ label: string; value: string }>>(
    filter?.optionsConfig?.static || [{ label: '', value: '' }]
  )
  const [dynamicConfig, setDynamicConfig] = useState({
    datasourceId: filter?.optionsConfig?.dynamic?.datasourceId || '',
    template: filter?.optionsConfig?.dynamic?.template || {}
  })
  const [datasources, setDatasources] = useState<Datasource[]>([])
  const [loadingDatasources, setLoadingDatasources] = useState(false)
  const [templateFields, setTemplateFields] = useState<Array<{ key: string; value: string }>>(
    Object.entries(filter?.optionsConfig?.dynamic?.template || {}).map(([key, value]) => ({ key, value }))
  )
  
  // Extrai os caminhos disponíveis do schema
  const extractSchemaPaths = (schema: Record<string, any>, prefix = ''): string[] => {
    const paths: string[] = []
    
    for (const key in schema) {
      if (key.startsWith('_')) continue // Ignora campos internos como _type
      
      const currentPath = prefix ? `${prefix}.${key}` : key
      paths.push(currentPath)
      
      const value = schema[key]
      if (value && typeof value === 'object') {
        if (value._type === 'array' && value._itemSchema) {
          // Para arrays, adiciona os campos do item
          const itemPaths = extractSchemaPaths(value._itemSchema, currentPath)
          paths.push(...itemPaths)
        } else if (value._type === 'object') {
          // Para objetos aninhados, continua recursivamente
          const nestedPaths = extractSchemaPaths(value, currentPath)
          paths.push(...nestedPaths)
        }
      }
    }
    
    return paths
  }
  
  // Obtém o datasource selecionado
  const selectedDatasource = datasources.find(ds => ds.id === dynamicConfig.datasourceId)
  const availablePaths = selectedDatasource?.sampleSchema 
    ? extractSchemaPaths(selectedDatasource.sampleSchema)
    : []

  // Carrega datasources disponíveis
  const loadDatasources = async () => {
    if (!projectKey) return
    
    setLoadingDatasources(true)
    try {
      const response = await get(`/projects/${projectKey}/datasources`)
      const data = await response.json()
      setDatasources(data)
    } catch (error) {
      console.error('Erro ao carregar datasources:', error)
      setDatasources([])
    } finally {
      setLoadingDatasources(false)
    }
  }

  // Carrega datasources quando o modal abre
  useEffect(() => {
    if (isOpen) {
      loadDatasources()
    }
  }, [isOpen, projectKey])

  // Atualiza o formulário quando o filtro a ser editado mudar
  useEffect(() => {
    if (filter) {
      setFormData({
        projectKey: filter.projectKey,
        slug: filter.slug,
        name: filter.name,
        type: filter.type,
        active: filter.active,
        order: filter.order,
        dependencies: filter.dependencies || [],
        optionsConfig: filter.optionsConfig || {},
        uiConfig: filter.uiConfig || {},
      })
      
      // Configura a origem das opções
      setOptionsSource(filter.optionsConfig?.dynamic ? 'dynamic' : 'static')
      
      // Configura opções estáticas
      if (filter.optionsConfig?.static) {
        setStaticOptions(filter.optionsConfig.static)
      } else {
        setStaticOptions([{ label: '', value: '' }])
      }
      
      // Configura opções dinâmicas
      if (filter.optionsConfig?.dynamic) {
        setDynamicConfig({
          datasourceId: filter.optionsConfig.dynamic.datasourceId,
          template: filter.optionsConfig.dynamic.template || {}
        })
        setTemplateFields(
          Object.entries(filter.optionsConfig.dynamic.template || {}).map(([key, value]) => ({ key, value }))
        )
      } else {
        setDynamicConfig({ datasourceId: '', template: {} })
        setTemplateFields([])
      }
    } else {
      // Reset para novo filtro
      setFormData({
        projectKey,
        slug: '',
        name: '',
        type: 'select',
        active: true,
        order: Math.max(0, ...existingFilters.map(f => f.order)) + 1,
        dependencies: [],
        optionsConfig: {},
        uiConfig: {},
      })
      setOptionsSource('static')
      setStaticOptions([{ label: '', value: '' }])
      setDynamicConfig({ datasourceId: '', template: {} })
      setTemplateFields([])
    }
    setErrors({})
  }, [filter, projectKey, existingFilters])

  // Bloqueia o scroll da página quando o modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug é obrigatório'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug deve conter apenas letras, números, hífen e underscore'
    } else if (existingFilters.some(f => f.slug === formData.slug && f._id !== filter?._id)) {
      newErrors.slug = 'Slug já existe neste projeto'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }
    
    if (formData.type === 'select') {
      if (optionsSource === 'static' && staticOptions.some(opt => !opt.label.trim() || !opt.value.trim())) {
        newErrors.options = 'Todas as opções devem ter label e value preenchidos'
      }
      if (optionsSource === 'dynamic' && !dynamicConfig.datasourceId.trim()) {
        newErrors.datasource = 'Datasource é obrigatório para opções dinâmicas'
      }
      
      // Validar campos do template contra o schema
      if (optionsSource === 'dynamic' && availablePaths.length > 0) {
        const invalidFields: string[] = []
        templateFields.forEach(field => {
          // Extrai o campo do template (remove {{ e }})
          const match = field.value.match(/\{\{(.+?)\}\}/)
          if (match) {
            const fieldPath = match[1].trim()
            if (!availablePaths.includes(fieldPath)) {
              invalidFields.push(fieldPath)
            }
          }
        })
        
        if (invalidFields.length > 0) {
          newErrors.template = `Os seguintes campos não existem no schema do datasource: ${invalidFields.join(', ')}`
        }
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    const submitData = { ...formData }
    
    // Configura opções baseado no tipo selecionado
    if (formData.type === 'select') {
      if (optionsSource === 'static' && staticOptions.length > 0 && staticOptions[0].label) {
        submitData.optionsConfig = {
          static: staticOptions.filter(opt => opt.label.trim() && opt.value.trim())
        }
      } else if (optionsSource === 'dynamic' && dynamicConfig.datasourceId) {
        const template: Record<string, string> = {}
        templateFields.forEach(field => {
          if (field.key.trim() && field.value.trim()) {
            template[field.key] = field.value
          }
        })
        
        submitData.optionsConfig = {
          dynamic: {
            datasourceId: dynamicConfig.datasourceId,
            template
          }
        }
      }
    }
    
    setIsLoading(true)
    try {
      await onSave(submitData)
      onClose()
    } catch (error) {
      console.error('Erro ao salvar filtro:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addStaticOption = () => {
    setStaticOptions([...staticOptions, { label: '', value: '' }])
  }

  const removeStaticOption = (index: number) => {
    setStaticOptions(staticOptions.filter((_, i) => i !== index))
  }

  const updateStaticOption = (index: number, field: 'label' | 'value', value: string) => {
    const updated = [...staticOptions]
    updated[index][field] = value
    setStaticOptions(updated)
  }

  const addDependency = () => {
    setFormData({
      ...formData,
      dependencies: [...formData.dependencies, { sourceFilterId: '', type: 'restrictOptions' }]
    })
  }

  const removeDependency = (index: number) => {
    setFormData({
      ...formData,
      dependencies: formData.dependencies.filter((_, i) => i !== index)
    })
  }

  const updateDependency = (index: number, field: 'sourceFilterId' | 'type', value: string) => {
    const updated = [...formData.dependencies]
    updated[index][field] = value as any
    setFormData({ ...formData, dependencies: updated })
  }

  const addTemplateField = () => {
    setTemplateFields([...templateFields, { key: '', value: '' }])
  }

  const removeTemplateField = (index: number) => {
    setTemplateFields(templateFields.filter((_, i) => i !== index))
  }

  const updateTemplateField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...templateFields]
    updated[index][field] = value
    setTemplateFields(updated)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Slug *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Identificador único usado na URL e código (ex: country, price-range)
                </p>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.slug ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="country"
                  disabled={!!filter} // Não permite editar slug de filtro existente
                />
                {errors.slug && (
                  <p className="text-red-500 text-sm mt-1">{errors.slug}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Nome amigável exibido para o usuário (ex: País, Faixa de Preço)
                </p>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="País"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tipo *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Como o usuário vai interagir com o filtro
                </p>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="select">Seleção</option>
                  <option value="range">Intervalo</option>
                  <option value="text">Texto</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Ordem
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Posição de exibição do filtro
                </p>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="mr-2"
                  />
                  <span>
                    Ativo
                    <span className="block text-xs text-gray-500 font-normal">Visível para usuários</span>
                  </span>
                </label>
              </div>
            </div>

            {/* Configurações específicas por tipo */}
            {formData.type === 'select' && (
              <div className="space-y-4">
                {/* Seleção do tipo de origem dos dados */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Origem dos Dados
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="static"
                        checked={optionsSource === 'static'}
                        onChange={(e) => setOptionsSource(e.target.value as 'static')}
                        className="mr-2"
                      />
                      Estático (manual)
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="dynamic"
                        checked={optionsSource === 'dynamic'}
                        onChange={(e) => setOptionsSource(e.target.value as 'dynamic')}
                        className="mr-2"
                      />
                      Dinâmico (API)
                    </label>
                  </div>
                </div>

                {/* Opções Estáticas */}
                {optionsSource === 'static' && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Opções Estáticas
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Defina as opções que o usuário poderá selecionar neste filtro
                    </p>
                    <div className="space-y-2">
                      {staticOptions.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Label (ex: Brasil)"
                            value={option.label}
                            onChange={(e) => updateStaticOption(index, 'label', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            placeholder="Value (ex: BR)"
                            value={option.value}
                            onChange={(e) => updateStaticOption(index, 'value', e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeStaticOption(index)}
                            disabled={staticOptions.length === 1}
                          >
                            Remover
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" onClick={addStaticOption}>
                        Adicionar Opção
                      </Button>
                    </div>
                    {errors.options && (
                      <p className="text-red-500 text-sm mt-1">{errors.options}</p>
                    )}
                  </div>
                )}

                {/* Opções Dinâmicas */}
                {optionsSource === 'dynamic' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Datasource *
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Selecione o datasource de onde os dados serão carregados
                      </p>
                      
                      {loadingDatasources ? (
                        <div className="px-3 py-2 border border-gray-300 rounded-md text-gray-500">
                          Carregando datasources...
                        </div>
                      ) : datasources.length === 0 ? (
                        <div className="px-3 py-2 border border-yellow-300 bg-yellow-50 rounded-md text-yellow-800 text-sm">
                          ⚠️ Nenhum datasource disponível. <a href={`/projects/${projectKey}/datasources`} className="underline font-medium">Criar datasource</a>
                        </div>
                      ) : (
                        <select
                          value={dynamicConfig.datasourceId}
                          onChange={(e) => setDynamicConfig({ ...dynamicConfig, datasourceId: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.datasource ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Selecione um datasource</option>
                          {datasources.map((ds) => (
                            <option key={ds._id} value={ds.id}>
                              {ds.name} ({ds.id})
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {errors.datasource && (
                        <p className="text-red-500 text-sm mt-1">{errors.datasource}</p>
                      )}
                      
                      {/* Informações do datasource selecionado */}
                      {dynamicConfig.datasourceId && datasources.length > 0 && (() => {
                        const selectedDatasource = datasources.find(ds => ds.id === dynamicConfig.datasourceId)
                        if (selectedDatasource) {
                          return (
                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                              <div className="flex items-start gap-2">
                                <span className="text-lg">ℹ️</span>
                                <div className="flex-1">
                                  <p className="font-medium text-blue-900 mb-1">Informações do Datasource:</p>
                                  <ul className="space-y-1 text-blue-800">
                                    <li><span className="font-medium">Tipo:</span> {selectedDatasource.type === 'rest_api' ? 'REST API' : selectedDatasource.type}</li>
                                    {selectedDatasource.config.baseUrl && (
                                      <li>
                                        <span className="font-medium">URL:</span>{' '}
                                        <code className="bg-blue-100 px-1 rounded text-xs">
                                          {selectedDatasource.config.baseUrl}
                                        </code>
                                      </li>
                                    )}
                                    {selectedDatasource.config.method && (
                                      <li>
                                        <span className="font-medium">Método:</span>{' '}
                                        <span className="font-mono text-xs">{selectedDatasource.config.method}</span>
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        return null
                      })()}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Template de Mapeamento
                      </label>
                      <p className="text-xs text-gray-500 mb-2">
                        Mapeie os campos da API para os parâmetros do filtro (use {`{{campo}}`} para variáveis)
                      </p>
                      
                      {/* Campos Disponíveis do Schema */}
                      {availablePaths.length > 0 && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            📋 Campos Disponíveis no Datasource:
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {availablePaths.map((path) => (
                              <button
                                key={path}
                                type="button"
                                onClick={() => {
                                  // Adiciona um novo campo de template com o caminho sugerido
                                  const newFields = [...templateFields, { key: '', value: `{{${path}}}` }]
                                  setTemplateFields(newFields)
                                }}
                                className="px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono hover:bg-blue-100 transition-colors"
                                title={`Clique para adicionar ${path} ao template`}
                              >
                                {path}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-gray-600 mt-2">
                            💡 Clique em um campo para adicioná-lo ao template
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {templateFields.length > 0 ? (
                          templateFields.map((field, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Parâmetro (ex: label, value)"
                                value={field.key}
                                onChange={(e) => updateTemplateField(index, 'key', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                placeholder="Valor (ex: {{country}})"
                                value={field.value}
                                onChange={(e) => updateTemplateField(index, 'value', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                list={`schema-paths-${index}`}
                              />
                              <datalist id={`schema-paths-${index}`}>
                                {availablePaths.map((path) => (
                                  <option key={path} value={`{{${path}}}`} />
                                ))}
                              </datalist>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeTemplateField(index)}
                              >
                                Remover
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            Nenhum mapeamento configurado. Clique em "Adicionar Mapeamento" para começar.
                          </p>
                        )}
                        <Button type="button" variant="outline" onClick={addTemplateField}>
                          Adicionar Mapeamento
                        </Button>
                        
                        {errors.template && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-red-700 text-sm">⚠️ {errors.template}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {formData.type === 'range' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Modo do Intervalo
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Tipo de valor para o intervalo (ex: preço, idade, período)
                </p>
                <select
                  value={formData.uiConfig?.mode || 'number'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    uiConfig: { ...formData.uiConfig, mode: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="number">Numérico</option>
                  <option value="date">Data</option>
                </select>
              </div>
            )}

            {formData.type === 'text' && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Placeholder
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Texto de exemplo exibido no campo vazio (ex: "Digite o nome do produto")
                </p>
                <input
                  type="text"
                  value={formData.uiConfig?.placeholder || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    uiConfig: { ...formData.uiConfig, placeholder: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite o texto..."
                />
              </div>
            )}

            {/* Dependências */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Dependências
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Configure quando este filtro deve aparecer ou ter suas opções limitadas por outro filtro
              </p>
              <div className="space-y-2">
                {formData.dependencies.map((dep, index) => (
                  <div key={index} className="flex gap-2">
                    <select
                      value={dep.sourceFilterId}
                      onChange={(e) => updateDependency(index, 'sourceFilterId', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione um filtro</option>
                      {existingFilters
                        .filter(f => f.slug !== formData.slug)
                        .map(f => (
                          <option key={f.slug} value={f.slug}>{f.name}</option>
                        ))}
                    </select>
                    <select
                      value={dep.type}
                      onChange={(e) => updateDependency(index, 'type', e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="restrictOptions">Restringir Opções</option>
                      <option value="conditionalShow">Mostrar Condicionalmente</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeDependency(index)}
                    >
                      Remover
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addDependency}>
                  Adicionar Dependência
                </Button>
              </div>
            </div>

            <div className="flex justify-end space-x-3 border-t border-gray-200 -mx-6 px-6 mt-6 pt-6">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}