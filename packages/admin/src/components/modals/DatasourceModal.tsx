import { useState, useEffect } from 'react'
import { Button } from '../ui/button'

interface Datasource {
  _id?: string
  projectKey: string
  id: string
  name: string
  type: 'rest_api' | 'mongodb' | 'sql' | 'static'
  config: {
    baseUrl?: string
    method?: string
    headers?: Record<string, string>
    auth?: {
      type: 'none' | 'bearer' | 'basic' | 'apikey'
      token?: string
      username?: string
      password?: string
      apiKey?: string
      apiKeyHeader?: string
    }
    body?: string
    queryParams?: Record<string, string>
    responsePath?: string
  }
  sampleSchema?: Record<string, any>
  enabled?: boolean
  syncConfig?: {
    enabled: boolean
    interval: '5m' | '15m' | '1h' | '6h' | '24h'
    externalCodeField?: string
    labelField?: string
    valueField?: string
    metadataFieldMapping?: Record<string, string>
  }
  lastSync?: {
    date: string | Date
    status: 'success' | 'error'
    stats?: {
      recordsFound: number
      recordsAdded: number
      recordsUpdated: number
      recordsDisabled: number
    }
    error?: string
  }
}

interface DatasourceFormData {
  projectKey: string
  id: string
  name: string
  type: 'rest_api' | 'mongodb' | 'sql' | 'static'
  config: Datasource['config']
  sampleSchema?: Record<string, any>
  enabled?: boolean
  syncConfig?: {
    enabled: boolean
    interval: '5m' | '15m' | '1h' | '6h' | '24h'
    externalCodeField?: string
    labelField?: string
    valueField?: string
    metadataFieldMapping?: Record<string, string>
  }
}

interface DatasourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (datasource: DatasourceFormData) => Promise<void>
  datasource?: Datasource
  title: string
  projectKey: string
}

export function DatasourceModal({
  isOpen,
  onClose,
  onSave,
  datasource,
  title,
  projectKey,
}: DatasourceModalProps) {
  const [formData, setFormData] = useState<DatasourceFormData>({
    projectKey,
    id: datasource?.id || '',
    name: datasource?.name || '',
    type: datasource?.type || 'rest_api',
    config: datasource?.config || {
      baseUrl: '',
      method: 'GET',
      headers: {},
      auth: { type: 'none' },
      queryParams: {},
      responsePath: ''
    },
    sampleSchema: datasource?.sampleSchema || undefined,
    enabled: datasource?.enabled !== undefined ? datasource.enabled : true,
    syncConfig: datasource?.syncConfig || {
      enabled: false,
      interval: '1h',
      externalCodeField: 'id',
      labelField: 'name',
      valueField: 'id',
      metadataFieldMapping: {}
    }
  })

  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // Função para extrair o schema de um objeto
  const extractSchema = (obj: any, maxDepth = 3, currentDepth = 0): Record<string, any> => {
    if (currentDepth >= maxDepth || obj === null || obj === undefined) {
      return {}
    }

    const schema: Record<string, any> = {}

    if (Array.isArray(obj)) {
      // Para arrays, pega o schema do primeiro item
      if (obj.length > 0) {
        schema._type = 'array'
        schema._itemSchema = extractSchema(obj[0], maxDepth, currentDepth + 1)
      }
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        const value = obj[key]
        const valueType = Array.isArray(value) ? 'array' : typeof value

        if (valueType === 'object' && value !== null) {
          schema[key] = {
            _type: 'object',
            ...extractSchema(value, maxDepth, currentDepth + 1)
          }
        } else if (valueType === 'array') {
          schema[key] = {
            _type: 'array',
            _itemSchema: value.length > 0 ? extractSchema(value[0], maxDepth, currentDepth + 1) : {}
          }
        } else {
          schema[key] = { _type: valueType }
        }
      }
    }

    return schema
  }
  
  // Headers
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>(
    Object.entries(datasource?.config.headers || {}).map(([key, value]) => ({ key, value }))
  )
  
  // Query Params
  const [queryParams, setQueryParams] = useState<Array<{ key: string; value: string }>>(
    Object.entries(datasource?.config.queryParams || {}).map(([key, value]) => ({ key, value }))
  )

  // Atualiza o formulário quando o datasource mudar
  useEffect(() => {
    if (datasource) {
      setFormData({
        projectKey: datasource.projectKey,
        id: datasource.id,
        name: datasource.name,
        type: datasource.type,
        config: datasource.config,
        sampleSchema: datasource.sampleSchema,
        enabled: datasource.enabled !== undefined ? datasource.enabled : true,
        syncConfig: datasource.syncConfig || {
          enabled: false,
          interval: '1h',
          externalCodeField: 'id',
          labelField: 'name',
          valueField: 'id'
        }
      })
      setHeaders(Object.entries(datasource.config.headers || {}).map(([key, value]) => ({ key, value })))
      setQueryParams(Object.entries(datasource.config.queryParams || {}).map(([key, value]) => ({ key, value })))
    } else {
      setFormData({
        projectKey,
        id: '',
        name: '',
        type: 'rest_api',
        config: {
          baseUrl: '',
          method: 'GET',
          headers: {},
          auth: { type: 'none' },
          queryParams: {},
          responsePath: ''
        },
        sampleSchema: undefined,
        enabled: true,
        syncConfig: {
          enabled: false,
          interval: '1h',
          externalCodeField: 'id',
          labelField: 'name',
          valueField: 'id',
          metadataFieldMapping: {}
        }
      })
      setHeaders([])
      setQueryParams([])
    }
    setErrors({})
    setTestResult(null)
  }, [datasource, projectKey])

  // Bloqueia scroll quando modal aberto
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
    
    if (!formData.id.trim()) {
      newErrors.id = 'ID é obrigatório'
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.id)) {
      newErrors.id = 'ID deve conter apenas letras, números, hífen e underscore'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório'
    }
    
    if (formData.type === 'rest_api' && !formData.config.baseUrl?.trim()) {
      newErrors.baseUrl = 'URL base é obrigatória para REST API'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleTestConnection = async () => {
    if (!validateForm()) {
      setTestResult({ success: false, error: 'Por favor, corrija os erros antes de testar' })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      // Construir headers
      const headersObj: Record<string, string> = {}
      headers.forEach(h => {
        if (h.key.trim() && h.value.trim()) {
          headersObj[h.key] = h.value
        }
      })

      // Adicionar autenticação aos headers
      if (formData.config.auth?.type === 'bearer' && formData.config.auth.token) {
        headersObj['Authorization'] = `Bearer ${formData.config.auth.token}`
      } else if (formData.config.auth?.type === 'apikey' && formData.config.auth.apiKey) {
        const headerName = formData.config.auth.apiKeyHeader || 'X-API-Key'
        headersObj[headerName] = formData.config.auth.apiKey
      } else if (formData.config.auth?.type === 'basic' && formData.config.auth.username && formData.config.auth.password) {
        const credentials = btoa(`${formData.config.auth.username}:${formData.config.auth.password}`)
        headersObj['Authorization'] = `Basic ${credentials}`
      }

      // Construir query params
      const paramsObj: Record<string, string> = {}
      queryParams.forEach(p => {
        if (p.key.trim() && p.value.trim()) {
          // Substituir templates por valores de teste (para testar a conexão)
          let testValue = p.value
          if (testValue.includes('{{') && testValue.includes('}}')) {
            // Para teste, usar valores dummy
            testValue = testValue.replace(/\{\{country\}\}/g, 'Brazil')
            testValue = testValue.replace(/\{\{city\}\}/g, 'sao-paulo')
            testValue = testValue.replace(/\{\{(\w+)\}\}/g, 'test-value')
          }
          paramsObj[p.key] = testValue
        }
      })

      const queryString = new URLSearchParams(paramsObj).toString()
      const url = queryString ? `${formData.config.baseUrl}?${queryString}` : formData.config.baseUrl

      // Fazer requisição
      const options: RequestInit = {
        method: formData.config.method || 'GET',
        headers: headersObj
      }

      if (formData.config.body && (formData.config.method === 'POST' || formData.config.method === 'PUT')) {
        options.body = formData.config.body
      }

      const response = await fetch(url!, options)
      const data = await response.json()

      if (response.ok) {
        // Navegar pelo responsePath se especificado
        let resultData = data
        if (formData.config.responsePath) {
          const paths = formData.config.responsePath.split('.')
          for (const path of paths) {
            if (resultData && typeof resultData === 'object') {
              resultData = resultData[path]
            }
          }
        }

        // Extrair schema do primeiro item
        const sampleItem = Array.isArray(resultData) ? resultData[0] : resultData
        const schema = extractSchema(sampleItem)

        // Atualizar formData com o schema
        setFormData({
          ...formData,
          sampleSchema: schema
        })

        setTestResult({
          success: true,
          data: sampleItem
        })
      } else {
        setTestResult({
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao testar conexão'
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    // Montar config final
    const headersObj: Record<string, string> = {}
    headers.forEach(h => {
      if (h.key.trim() && h.value.trim()) {
        headersObj[h.key] = h.value
      }
    })

    const paramsObj: Record<string, string> = {}
    queryParams.forEach(p => {
      if (p.key.trim()) {
        // Permite valores vazios ou com template (ex: {{country}})
        paramsObj[p.key] = p.value
      }
    })

    const submitData: DatasourceFormData = {
      ...formData,
      config: {
        ...formData.config,
        headers: headersObj,
        queryParams: paramsObj
      },
      sampleSchema: formData.sampleSchema
    }

    setIsLoading(true)
    try {
      await onSave(submitData)
      onClose()
    } catch (error) {
      console.error('Erro ao salvar datasource:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }])
  }

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index))
  }

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...headers]
    updated[index][field] = value
    setHeaders(updated)
  }

  const addQueryParam = () => {
    setQueryParams([...queryParams, { key: '', value: '' }])
  }

  const removeQueryParam = (index: number) => {
    setQueryParams(queryParams.filter((_, i) => i !== index))
  }

  const updateQueryParam = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...queryParams]
    updated[index][field] = value
    setQueryParams(updated)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
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
                  ID do Datasource *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Identificador único usado para referenciar este datasource
                </p>
                <input
                  type="text"
                  value={formData.id}
                  onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.id ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ex: products-api"
                  disabled={!!datasource}
                />
                {errors.id && (
                  <p className="text-red-500 text-sm mt-1">{errors.id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nome *
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Nome descritivo para identificação
                </p>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="ex: API de Produtos"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo de Datasource
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="rest_api">REST API</option>
                <option value="mongodb">MongoDB</option>
                <option value="sql">SQL Database</option>
                <option value="static">Estático</option>
              </select>
            </div>

            {/* Status do Datasource */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="enabled" className="text-sm font-medium">
                Datasource Ativo
              </label>
            </div>

            {/* Configurações específicas para REST API */}
            {formData.type === 'rest_api' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg">Configuração REST API</h3>
                
                {/* URL e Método */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      URL Base *
                    </label>
                    <input
                      type="url"
                      value={formData.config.baseUrl || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, baseUrl: e.target.value }
                      })}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.baseUrl ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="https://api.example.com/products"
                    />
                    {errors.baseUrl && (
                      <p className="text-red-500 text-sm mt-1">{errors.baseUrl}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Método HTTP
                    </label>
                    <select
                      value={formData.config.method || 'GET'}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, method: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                </div>

                {/* Autenticação */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">
                    Autenticação
                  </label>
                  <select
                    value={formData.config.auth?.type || 'none'}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        auth: { type: e.target.value as any }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  >
                    <option value="none">Sem autenticação</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="basic">Basic Auth</option>
                    <option value="apikey">API Key</option>
                  </select>

                  {formData.config.auth?.type === 'bearer' && (
                    <input
                      type="password"
                      placeholder="Token"
                      value={formData.config.auth.token || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: {
                          ...formData.config,
                          auth: { ...formData.config.auth!, token: e.target.value }
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {formData.config.auth?.type === 'basic' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Username"
                        value={formData.config.auth.username || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            auth: { ...formData.config.auth!, username: e.target.value }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={formData.config.auth.password || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            auth: { ...formData.config.auth!, password: e.target.value }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}

                  {formData.config.auth?.type === 'apikey' && (
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Header Name (ex: X-API-Key)"
                        value={formData.config.auth.apiKeyHeader || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            auth: { ...formData.config.auth!, apiKeyHeader: e.target.value }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="password"
                        placeholder="API Key"
                        value={formData.config.auth.apiKey || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          config: {
                            ...formData.config,
                            auth: { ...formData.config.auth!, apiKey: e.target.value }
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>

                {/* Headers */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">
                    Headers Personalizados
                  </label>
                  <div className="space-y-2">
                    {headers.map((header, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Header Name"
                          value={header.key}
                          onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={header.value}
                          onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeHeader(index)}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addHeader}>
                      Adicionar Header
                    </Button>
                  </div>
                </div>

                {/* Query Params */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-2">
                    Query Parameters
                  </label>
                  <div className="space-y-2">
                    {queryParams.map((param, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Parameter Name"
                          value={param.key}
                          onChange={(e) => updateQueryParam(index, 'key', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={param.value}
                          onChange={(e) => updateQueryParam(index, 'value', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeQueryParam(index)}
                        >
                          Remover
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" onClick={addQueryParam}>
                      Adicionar Parameter
                    </Button>
                  </div>
                </div>

                {/* Response Path */}
                <div className="border-t pt-4">
                  <label className="block text-sm font-medium mb-1">
                    Caminho da Resposta (opcional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Se a resposta está aninhada, especifique o caminho (ex: data.products)
                  </p>
                  <input
                    type="text"
                    value={formData.config.responsePath || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, responsePath: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ex: data.items"
                  />
                </div>

                {/* Body (para POST/PUT) */}
                {(formData.config.method === 'POST' || formData.config.method === 'PUT') && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium mb-1">
                      Request Body (JSON)
                    </label>
                    <textarea
                      value={formData.config.body || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, body: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={6}
                      placeholder='{\n  "key": "value"\n}'
                    />
                  </div>
                )}

                {/* Botão de Testar */}
                <div className="border-t pt-4">
                  <Button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    variant="outline"
                    className="w-full"
                  >
                    {isTesting ? 'Testando...' : '🔍 Testar Conexão'}
                  </Button>

                  {/* Resultado do Teste */}
                  {testResult && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="text-2xl">
                          {testResult.success ? '✅' : '❌'}
                        </span>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">
                            {testResult.success ? 'Conexão bem-sucedida!' : 'Erro na conexão'}
                          </h4>
                          
                          {testResult.error && (
                            <p className="text-sm text-red-700">{testResult.error}</p>
                          )}
                          
                          {testResult.data && (
                            <div>
                              <p className="text-sm font-medium mb-2">Preview do primeiro item:</p>
                              <pre className="bg-white p-3 rounded border text-xs overflow-x-auto max-h-60">
                                {JSON.stringify(testResult.data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Schema Salvo */}
                  {formData.sampleSchema && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        📋 Schema Detectado
                        <span className="text-xs font-normal text-gray-600">(será usado para autocomplete no template)</span>
                      </h4>
                      <div className="bg-white p-3 rounded border text-xs overflow-x-auto max-h-40">
                        <pre>{JSON.stringify(formData.sampleSchema, null, 2)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Configurações específicas para MongoDB */}
            {formData.type === 'mongodb' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg">Configuração MongoDB</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Connection String *
                  </label>
                  <input
                    type="text"
                    value={formData.config.connectionString || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, connectionString: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="mongodb://username:password@host:27017"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Database *
                    </label>
                    <input
                      type="text"
                      value={formData.config.database || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, database: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="myDatabase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Collection *
                    </label>
                    <input
                      type="text"
                      value={formData.config.collection || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, collection: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="myCollection"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Query (JSON)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Filtro MongoDB em formato JSON (opcional, vazio = todos os documentos)
                  </p>
                  <textarea
                    value={typeof formData.config.query === 'object' 
                      ? JSON.stringify(formData.config.query, null, 2)
                      : formData.config.query || '{}'}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({
                          ...formData,
                          config: { ...formData.config, query: parsed }
                        });
                      } catch {
                        setFormData({
                          ...formData,
                          config: { ...formData.config, query: e.target.value }
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={4}
                    placeholder='{ "status": "active" }'
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Projection (JSON)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Campos a retornar (opcional, vazio = todos os campos)
                  </p>
                  <textarea
                    value={typeof formData.config.projection === 'object'
                      ? JSON.stringify(formData.config.projection, null, 2)
                      : formData.config.projection || '{}'}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData({
                          ...formData,
                          config: { ...formData.config, projection: parsed }
                        });
                      } catch {
                        setFormData({
                          ...formData,
                          config: { ...formData.config, projection: e.target.value }
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={3}
                    placeholder='{ "name": 1, "email": 1 }'
                  />
                </div>
              </div>
            )}

            {/* Configurações específicas para SQL */}
            {formData.type === 'sql' && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg">Configuração SQL Database</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Engine *
                  </label>
                  <select
                    value={formData.config.engine || 'postgresql'}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, engine: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="postgresql">PostgreSQL</option>
                    <option value="mysql">MySQL</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Host *
                    </label>
                    <input
                      type="text"
                      value={formData.config.host || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, host: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="localhost"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Port
                    </label>
                    <input
                      type="number"
                      value={formData.config.port || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, port: parseInt(e.target.value) || undefined }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.config.engine === 'mysql' ? '3306' : '5432'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Database *
                    </label>
                    <input
                      type="text"
                      value={formData.config.database || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, database: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="myDatabase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.config.username || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        config: { ...formData.config, username: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="postgres"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.config.password || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, password: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    SQL Query *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Query SQL para buscar os dados (SELECT)
                  </p>
                  <textarea
                    value={formData.config.query || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, query: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    rows={4}
                    placeholder="SELECT id, name, email FROM users WHERE status = 'active'"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="ssl"
                    checked={formData.config.ssl || false}
                    onChange={(e) => setFormData({
                      ...formData,
                      config: { ...formData.config, ssl: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="ssl" className="text-sm font-medium">
                    Usar SSL/TLS
                  </label>
                </div>
              </div>
            )}

            {/* Configurações de Sincronização */}
            {(formData.type === 'rest_api' || formData.type === 'mongodb' || formData.type === 'sql') && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">⚙️ Sincronização Automática</h3>
                    <p className="text-sm text-gray-600">
                      Cache local com atualizações automáticas
                    </p>
                  </div>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.syncConfig?.enabled || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        syncConfig: {
                          ...formData.syncConfig!,
                          enabled: e.target.checked
                        }
                      })}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium">
                      {formData.syncConfig?.enabled ? 'Ativo' : 'Inativo'}
                    </span>
                  </label>
                </div>

                {formData.syncConfig?.enabled && (
                  <div className="space-y-4 pt-4 border-t border-purple-200">
                    {/* Intervalo de Sincronização */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Intervalo de Sincronização
                      </label>
                      <select
                        value={formData.syncConfig.interval}
                        onChange={(e) => setFormData({
                          ...formData,
                          syncConfig: {
                            ...formData.syncConfig!,
                            interval: e.target.value as any
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="5m">A cada 5 minutos</option>
                        <option value="15m">A cada 15 minutos</option>
                        <option value="1h">A cada 1 hora</option>
                        <option value="6h">A cada 6 horas</option>
                        <option value="24h">A cada 24 horas</option>
                      </select>
                    </div>

                    {/* Mapeamento de Campos */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Campo ID Externo *
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Chave primária da API
                        </p>
                        <input
                          type="text"
                          value={formData.syncConfig.externalCodeField || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            syncConfig: {
                              ...formData.syncConfig!,
                              externalCodeField: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="id"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Campo Label *
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Texto exibido
                        </p>
                        <input
                          type="text"
                          value={formData.syncConfig.labelField || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            syncConfig: {
                              ...formData.syncConfig!,
                              labelField: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="name"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Campo Value *
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Valor do filtro
                        </p>
                        <input
                          type="text"
                          value={formData.syncConfig.valueField || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            syncConfig: {
                              ...formData.syncConfig!,
                              valueField: e.target.value
                            }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="id"
                        />
                      </div>
                    </div>

                    {/* Mapeamento de Campos de Metadata */}
                    <div className="pt-4 border-t border-purple-200">
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-1">
                          🔗 Mapeamento de Filtros Dependentes
                        </label>
                        <p className="text-xs text-gray-500 mb-2">
                          Configure como parâmetros de filtros são mapeados para campos de metadata.
                          Exemplo: quando um filtro envia <code className="bg-gray-100 px-1">?city=sao-paulo</code>,
                          você pode mapear <code className="bg-gray-100 px-1">city → cities</code> para buscar em <code className="bg-gray-100 px-1">metadata.cities</code>
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        {Object.entries(formData.syncConfig.metadataFieldMapping || {}).map(([key, value], index) => (
                          <div key={index} className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={key}
                              onChange={(e) => {
                                const newMapping = { ...(formData.syncConfig?.metadataFieldMapping || {}) };
                                delete newMapping[key];
                                newMapping[e.target.value] = value;
                                setFormData({
                                  ...formData,
                                  syncConfig: {
                                    ...formData.syncConfig!,
                                    metadataFieldMapping: newMapping
                                  }
                                });
                              }}
                              placeholder="Parâmetro (ex: city)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            />
                            <span className="text-gray-400">→</span>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => {
                                const newMapping = { ...(formData.syncConfig?.metadataFieldMapping || {}) };
                                newMapping[key] = e.target.value;
                                setFormData({
                                  ...formData,
                                  syncConfig: {
                                    ...formData.syncConfig!,
                                    metadataFieldMapping: newMapping
                                  }
                                });
                              }}
                              placeholder="Campo metadata (ex: cities)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newMapping = { ...(formData.syncConfig?.metadataFieldMapping || {}) };
                                delete newMapping[key];
                                setFormData({
                                  ...formData,
                                  syncConfig: {
                                    ...formData.syncConfig!,
                                    metadataFieldMapping: newMapping
                                  }
                                });
                              }}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={() => {
                            const newMapping = { ...(formData.syncConfig?.metadataFieldMapping || {}) };
                            newMapping[''] = '';
                            setFormData({
                              ...formData,
                              syncConfig: {
                                ...formData.syncConfig!,
                                metadataFieldMapping: newMapping
                              }
                            });
                          }}
                          className="w-full px-3 py-2 border-2 border-dashed border-purple-300 text-purple-600 rounded-md hover:bg-purple-50 transition-colors text-sm font-medium"
                        >
                          + Adicionar Mapeamento
                        </button>
                      </div>

                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                        <p className="font-medium text-blue-900 mb-1">💡 Como funciona:</p>
                        <ul className="list-disc list-inside text-blue-800 space-y-1">
                          <li>Parâmetro: nome do query param enviado pelo filtro dependente</li>
                          <li>Campo metadata: nome do campo dentro de <code className="bg-blue-100 px-1">metadata</code> onde buscar</li>
                          <li>Exemplo: <code className="bg-blue-100 px-1">city → cities</code> faz <code className="bg-blue-100 px-1">?city=sao-paulo</code> buscar em <code className="bg-blue-100 px-1">metadata.cities</code></li>
                        </ul>
                      </div>
                    </div>

                    {/* Informação sobre última sincronização */}
                    {datasource?.lastSync && (
                      <div className="pt-4 border-t border-purple-200">
                        <h4 className="text-sm font-medium mb-2">📊 Última Sincronização</h4>
                        <div className="bg-white p-3 rounded border text-sm space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Data:</span>
                            <span className="font-medium">
                              {new Date(datasource.lastSync.date).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-medium ${
                              datasource.lastSync.status === 'success' 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {datasource.lastSync.status === 'success' ? '✅ Sucesso' : '❌ Erro'}
                            </span>
                          </div>
                          {datasource.lastSync.stats && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Registros encontrados:</span>
                                <span className="font-medium">{datasource.lastSync.stats.recordsFound}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Novos:</span>
                                <span className="font-medium text-green-600">
                                  +{datasource.lastSync.stats.recordsAdded}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Atualizados:</span>
                                <span className="font-medium text-blue-600">
                                  {datasource.lastSync.stats.recordsUpdated}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Desabilitados:</span>
                                <span className="font-medium text-orange-600">
                                  {datasource.lastSync.stats.recordsDisabled}
                                </span>
                              </div>
                            </>
                          )}
                          {datasource.lastSync.error && (
                            <div className="pt-2 border-t">
                              <span className="text-red-600 text-xs">{datasource.lastSync.error}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Informação de ajuda */}
                    <div className="bg-purple-100 p-3 rounded-md text-sm">
                      <p className="font-medium mb-1">💡 Como funciona:</p>
                      <ul className="list-disc list-inside space-y-1 text-gray-700">
                        <li>Dados são baixados automaticamente no intervalo configurado</li>
                        <li>Armazenados localmente no MongoDB para consultas rápidas</li>
                        <li>Registros novos são adicionados, existentes atualizados</li>
                        <li>Registros que sumiram da API são desabilitados (soft delete)</li>
                        <li>Filtros usam dados em cache, não chamam a API externa</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer com botões */}
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
