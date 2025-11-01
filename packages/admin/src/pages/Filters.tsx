import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { FilterModal } from '../components/modals/FilterModal'
import { useApi } from '../hooks/useApi'

interface Filter {
  _id: string
  projectKey: string
  slug: string
  name: string
  type: 'select' | 'range' | 'text'
  active: boolean
  order: number
  dependencies: Array<{
    filterSlug: string
    mode: 'affects' | 'affected-by'
    mapping: {
      myField?: string
      myMetadataField?: string
      targetField?: string
      targetMetadataField?: string
    }
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
  createdAt: string
}

interface FilterFormData {
  projectKey: string
  slug: string
  name: string
  type: 'select' | 'range' | 'text'
  active: boolean
  order: number
  dependencies: Array<{
    filterSlug: string
    mode: 'affects' | 'affected-by'
    mapping: {
      myField?: string
      myMetadataField?: string
      targetField?: string
      targetMetadataField?: string
    }
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

export function Filters() {
  const { projectKey } = useParams<{ projectKey: string }>()
  const [filters, setFilters] = useState<Filter[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFilter, setEditingFilter] = useState<Filter | undefined>()
  const api = useApi()

  useEffect(() => {
    if (projectKey) {
      fetchFilters()
    }
  }, [projectKey])

  const fetchFilters = async () => {
    if (!projectKey) return
    
    try {
      const response = await api.get(`/projects/${projectKey}/filters`)
      const data = await response.json()
      setFilters(data.sort((a: Filter, b: Filter) => a.order - b.order))
    } catch (error) {
      console.error('Erro ao buscar filtros:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateFilter = async (filterData: FilterFormData) => {
    if (!projectKey) return
    
    try {
      const response = await api.post(`/projects/${projectKey}/filters`, filterData)
      const newFilter = await response.json()
      setFilters([...filters, newFilter])
    } catch (error) {
      console.error('Erro ao criar filtro:', error)
      throw error
    }
  }

  const handleEditFilter = async (filterData: FilterFormData) => {
    if (!editingFilter || !projectKey) return
    
    try {
      const response = await api.patch(`/projects/${projectKey}/filters/${editingFilter._id}`, filterData)
      const updatedFilter = await response.json()
      setFilters(filters.map(f => f._id === editingFilter._id ? updatedFilter : f))
    } catch (error) {
      console.error('Erro ao editar filtro:', error)
      throw error
    }
  }

  const handleDeleteFilter = async (filterId: string) => {
    if (!confirm('Tem certeza que deseja excluir este filtro?')) return
    if (!projectKey) return

    try {
      await api.delete(`/projects/${projectKey}/filters/${filterId}`)
      setFilters(filters.filter(f => f._id !== filterId))
    } catch (error) {
      console.error('Erro ao excluir filtro:', error)
    }
  }

  const handleToggleActive = async (filter: Filter) => {
    if (!projectKey) return

    try {
      const response = await api.patch(`/projects/${projectKey}/filters/${filter._id}`, {
        ...filter,
        active: !filter.active
      })
      const updatedFilter = await response.json()
      setFilters(filters.map(f => f._id === filter._id ? updatedFilter : f))
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
  }

  const openCreateModal = () => {
    setEditingFilter(undefined)
    setIsModalOpen(true)
  }

  const openEditModal = (filter: Filter) => {
    setEditingFilter(filter)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingFilter(undefined)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'select': return 'Seleção'
      case 'range': return 'Intervalo'
      case 'text': return 'Texto'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Carregando filtros...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link 
            to="/projects" 
            className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-block"
          >
            ← Voltar para Projetos
          </Link>
          <h1 className="text-3xl font-bold">
            Filtros do Projeto: {projectKey}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link to={`/projects/${projectKey}/datasources`}>
            <Button variant="outline">
              📊 Datasources
            </Button>
          </Link>
          <Button onClick={openCreateModal}>
            Novo Filtro
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {filters.map((filter) => (
          <div key={filter._id} className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{filter.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    filter.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {filter.active ? 'Ativo' : 'Inativo'}
                  </span>
                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                    {getTypeLabel(filter.type)}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  Slug: <code className="bg-gray-100 px-2 py-1 rounded">{filter.slug}</code>
                </p>
                
                <div className="text-sm text-gray-600 mb-2">
                  Ordem: {filter.order}
                </div>

                {filter.dependencies.length > 0 && (
                  <div className="text-sm text-gray-600 mb-2">
                    Dependências: {filter.dependencies.map(dep => `${dep.filterSlug} (${dep.mode})`).join(', ')}
                  </div>
                )}

                {filter.optionsConfig?.static && (
                  <div className="text-sm text-gray-600 mb-2">
                    <span className="font-medium">Opções estáticas:</span> {filter.optionsConfig.static.length} itens
                  </div>
                )}

                {filter.optionsConfig?.dynamic && (
                  <div className="text-sm text-gray-600 mb-2">
                    <div className="font-medium">Opções dinâmicas:</div>
                    <div className="ml-2 text-xs">
                      <div>Datasource: <span className="font-mono bg-gray-100 px-1 rounded">{filter.optionsConfig.dynamic.datasourceId}</span></div>
                      {filter.optionsConfig.dynamic.template && Object.keys(filter.optionsConfig.dynamic.template).length > 0 && (
                        <div className="mt-1">
                          Template: {Object.entries(filter.optionsConfig.dynamic.template).map(([key, value]) => (
                            <span key={key} className="inline-block mr-2 bg-blue-50 px-1 rounded">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Criado em: {new Date(filter.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div className="flex space-x-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleToggleActive(filter)}
                >
                  {filter.active ? 'Desativar' : 'Ativar'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEditModal(filter)}
                >
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteFilter(filter._id)}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filters.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🔍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum filtro encontrado</h3>
          <p className="text-gray-500 mb-4">Comece criando seu primeiro filtro para este projeto.</p>
          <Button onClick={openCreateModal}>
            Criar Primeiro Filtro
          </Button>
        </div>
      )}

      <FilterModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={editingFilter ? handleEditFilter : handleCreateFilter}
        filter={editingFilter}
        title={editingFilter ? 'Editar Filtro' : 'Novo Filtro'}
        projectKey={projectKey!}
        existingFilters={filters}
      />
    </div>
  )
}