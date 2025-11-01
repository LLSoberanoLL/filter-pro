import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { ProjectModal } from '../components/modals/ProjectModal'
import { useApi } from '../hooks/useApi'

interface Project {
  _id: string
  projectKey: string
  name: string
  description?: string
  createdAt: string
}

interface ProjectFormData {
  projectKey: string
  name: string
  description?: string
}

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>()
  const api = useApi()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects')
      const data = await response.json()
      setProjects(data)
    } catch (error) {
      console.error('Erro ao buscar projetos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProject = async (projectData: ProjectFormData) => {
    try {
      const response = await api.post('/projects', projectData)
      const newProject = await response.json()
      setProjects([...projects, newProject])
    } catch (error) {
      console.error('Erro ao criar projeto:', error)
      throw error
    }
  }

  const handleEditProject = async (projectData: ProjectFormData) => {
    if (!editingProject) return
    
    try {
      const response = await api.put(`/projects/${editingProject.projectKey}`, projectData)
      const updatedProject = await response.json()
      setProjects(projects.map(p => p._id === editingProject._id ? updatedProject : p))
    } catch (error) {
      console.error('Erro ao editar projeto:', error)
      throw error
    }
  }

  const handleDeleteProject = async (projectKey: string) => {
    if (!confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      await api.delete(`/projects/${projectKey}`)
      setProjects(projects.filter(p => p.projectKey !== projectKey))
    } catch (error) {
      console.error('Erro ao excluir projeto:', error)
    }
  }

  const openCreateModal = () => {
    setEditingProject(undefined)
    setIsModalOpen(true)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingProject(undefined)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Carregando projetos...</div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Projetos</h1>
        <Button onClick={openCreateModal}>
          Novo Projeto
        </Button>
      </div>
      
      <div className="grid gap-4">
        {projects.map((project) => (
          <div key={project._id} className="p-6 border rounded-lg bg-white shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Chave: <code className="bg-gray-100 px-2 py-1 rounded">{project.projectKey}</code>
                </p>
                {project.description && (
                  <p className="text-sm text-gray-600 mb-4">{project.description}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Criado em: {new Date(project.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex space-x-2 ml-4">
                <Link to={`/projects/${project.projectKey}/filters`}>
                  <Button variant="outline" size="sm">
                    Gerenciar Filtros
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => openEditModal(project)}
                >
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteProject(project.projectKey)}
                  className="text-red-600 hover:text-red-700 hover:border-red-300"
                >
                  Excluir
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📁</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum projeto encontrado</h3>
          <p className="text-gray-500 mb-4">Comece criando seu primeiro projeto de filtros.</p>
          <Button onClick={openCreateModal}>
            Criar Primeiro Projeto
          </Button>
        </div>
      )}

      <ProjectModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={editingProject ? handleEditProject : handleCreateProject}
        project={editingProject}
        title={editingProject ? 'Editar Projeto' : 'Novo Projeto'}
      />
    </div>
  )
}