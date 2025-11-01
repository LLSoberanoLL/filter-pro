import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { useApi } from '../hooks/useApi'

interface DashboardStats {
  totalProjects: number
  totalFilters: number
  activeFilters: number
  recentProjects: Array<{
    _id: string
    projectKey: string
    name: string
    createdAt: string
  }>
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    totalFilters: 0,
    activeFilters: 0,
    recentProjects: []
  })
  const [loading, setLoading] = useState(true)
  const api = useApi()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Buscar projetos
      const projectsResponse = await api.get('/projects')
      const projects = await projectsResponse.json()
      
      // Buscar filtros de todos os projetos
      let allFilters: any[] = []
      for (const project of projects) {
        try {
          const filtersResponse = await api.get(`/projects/${project.projectKey}/filters`)
          const filters = await filtersResponse.json()
          allFilters = [...allFilters, ...filters]
        } catch (error) {
          console.error(`Erro ao buscar filtros do projeto ${project.projectKey}:`, error)
        }
      }

      setStats({
        totalProjects: projects.length,
        totalFilters: allFilters.length,
        activeFilters: allFilters.filter(f => f.active).length,
        recentProjects: projects
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
      })
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Carregando dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do sistema FilterPro
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Projetos
              </p>
              <p className="text-3xl font-bold">{stats.totalProjects}</p>
            </div>
            <div className="text-4xl">📁</div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total de Filtros
              </p>
              <p className="text-3xl font-bold">{stats.totalFilters}</p>
            </div>
            <div className="text-4xl">🔍</div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Filtros Ativos
              </p>
              <p className="text-3xl font-bold text-green-600">{stats.activeFilters}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Link to="/projects">
            <Button>Ver Todos os Projetos</Button>
          </Link>
          <Button variant="outline">Documentação da API</Button>
          <Button variant="outline">Exemplos de Integração</Button>
        </div>
      </div>

      {/* Projetos Recentes */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Projetos Recentes</h2>
          <Link to="/projects">
            <Button variant="outline" size="sm">Ver Todos</Button>
          </Link>
        </div>
        
        {stats.recentProjects.length > 0 ? (
          <div className="space-y-3">
            {stats.recentProjects.map((project) => (
              <div key={project._id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md">
                <div>
                  <h3 className="font-medium">{project.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {project.projectKey} • Criado em {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <Link to={`/projects/${project.projectKey}/filters`}>
                  <Button variant="outline" size="sm">
                    Gerenciar Filtros
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-5xl mb-3">📁</div>
            <p className="text-muted-foreground mb-4">Nenhum projeto criado ainda</p>
            <Link to="/projects">
              <Button>Criar Primeiro Projeto</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Dicas */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">💡 Dicas</h2>
        <ul className="space-y-2 text-blue-800">
          <li>• Use slugs descritivos para seus filtros (ex: "country", "date_range")</li>
          <li>• Configure dependências entre filtros para criar experiências dinâmicas</li>
          <li>• O Web Component pode ser integrado em qualquer framework JavaScript</li>
          <li>• Use a API para gerar queries MongoDB automaticamente</li>
        </ul>
      </div>
    </div>
  )
}