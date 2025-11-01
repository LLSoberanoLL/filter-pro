import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { DatasourceModal } from '../components/modals/DatasourceModal'
import { useApi } from '../hooks/useApi'

interface Datasource {
  _id: string
  projectKey: string
  id: string
  name: string
  type: 'rest_api' | 'graphql' | 'database'
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
  createdAt: string
  updatedAt: string
}

interface DatasourceFormData {
  projectKey: string
  id: string
  name: string
  type: 'rest_api' | 'graphql' | 'database'
  config: Datasource['config']
}

export function Datasources() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const api = useApi()
  
  const [datasources, setDatasources] = useState<Datasource[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDatasource, setEditingDatasource] = useState<Datasource | undefined>()

  useEffect(() => {
    loadDatasources()
  }, [projectKey])

  const loadDatasources = async () => {
    if (!projectKey) return
    
    setLoading(true)
    try {
      const response = await api.get(`/projects/${projectKey}/datasources`)
      const data = await response.json()
      setDatasources(data)
    } catch (error) {
      console.error('Erro ao carregar datasources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDatasource = async (datasourceData: DatasourceFormData) => {
    if (!projectKey) return
    
    try {
      const response = await api.post(`/projects/${projectKey}/datasources`, datasourceData)
      const newDatasource = await response.json()
      setDatasources([...datasources, newDatasource])
    } catch (error) {
      console.error('Erro ao criar datasource:', error)
      throw error
    }
  }

  const handleEditDatasource = async (datasourceData: DatasourceFormData) => {
    if (!editingDatasource || !projectKey) return
    
    try {
      const response = await api.patch(`/projects/${projectKey}/datasources/${editingDatasource.id}`, datasourceData)
      const updatedDatasource = await response.json()
      setDatasources(datasources.map(ds => ds.id === editingDatasource.id ? updatedDatasource : ds))
    } catch (error) {
      console.error('Erro ao editar datasource:', error)
      throw error
    }
  }

  const handleDeleteDatasource = async (datasourceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este datasource?')) return
    if (!projectKey) return

    try {
      await api.delete(`/projects/${projectKey}/datasources/${datasourceId}`)
      setDatasources(datasources.filter(ds => ds.id !== datasourceId))
    } catch (error) {
      console.error('Erro ao excluir datasource:', error)
    }
  }

  const openCreateModal = () => {
    setEditingDatasource(undefined)
    setIsModalOpen(true)
  }

  const openEditModal = (datasource: Datasource) => {
    setEditingDatasource(datasource)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingDatasource(undefined)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'rest_api': return 'REST API'
      case 'graphql': return 'GraphQL'
      case 'database': return 'Database'
      default: return type
    }
  }

  const getAuthLabel = (authType?: string) => {
    switch (authType) {
      case 'none': return 'Sem autenticação'
      case 'bearer': return 'Bearer Token'
      case 'basic': return 'Basic Auth'
      case 'apikey': return 'API Key'
      default: return 'Não configurado'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Carregando datasources...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link 
            to={`/projects/${projectKey}/filters`}
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            ← Voltar para Filtros
          </Link>
          <h1 className="text-2xl font-bold">Datasources do Projeto: {projectKey}</h1>
          <p className="text-muted-foreground">
            Gerencie fontes de dados reutilizáveis para seus filtros
          </p>
        </div>
        <Button onClick={openCreateModal}>
          Novo Datasource
        </Button>
      </div>

      {/* Lista de Datasources */}
      {datasources.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed">
          <div className="text-4xl mb-4">🔌</div>
          <h3 className="text-lg font-semibold mb-2">Nenhum datasource configurado</h3>
          <p className="text-muted-foreground mb-4">
            Crie datasources para conectar seus filtros a APIs e bancos de dados
          </p>
          <Button onClick={openCreateModal}>
            Criar Primeiro Datasource
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {datasources.map((datasource) => (
            <div
              key={datasource._id}
              className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{datasource.name}</h3>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium">
                      {getTypeLabel(datasource.type)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {datasource.config.baseUrl && (
                      <div className="text-gray-600">
                        <span className="font-medium">URL:</span>{' '}
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {datasource.config.baseUrl}
                        </code>
                      </div>
                    )}
                    
                    {datasource.config.method && (
                      <div className="text-gray-600">
                        <span className="font-medium">Método:</span>{' '}
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                          {datasource.config.method}
                        </span>
                      </div>
                    )}
                    
                    {datasource.config.auth && (
                      <div className="text-gray-600">
                        <span className="font-medium">Autenticação:</span>{' '}
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {getAuthLabel(datasource.config.auth.type)}
                        </span>
                      </div>
                    )}
                    
                    {datasource.config.headers && Object.keys(datasource.config.headers).length > 0 && (
                      <div className="text-gray-600">
                        <span className="font-medium">Headers:</span>{' '}
                        <span className="text-xs">{Object.keys(datasource.config.headers).length} configurados</span>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      ID: <code className="bg-gray-100 px-1 rounded">{datasource.id}</code>
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2 ml-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditModal(datasource)}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteDatasource(datasource.id)}
                    className="text-red-600 hover:text-red-700 hover:border-red-300"
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <DatasourceModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={editingDatasource ? handleEditDatasource : handleCreateDatasource}
        datasource={editingDatasource}
        title={editingDatasource ? 'Editar Datasource' : 'Novo Datasource'}
        projectKey={projectKey || ''}
      />
    </div>
  )
}
