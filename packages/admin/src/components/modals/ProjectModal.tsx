import { useState, useEffect } from 'react'
import { Button } from '../ui/button'

interface Project {
  _id?: string
  projectKey: string
  name: string
  description?: string
}

interface ProjectFormData {
  projectKey: string
  name: string
  description?: string
}

interface ProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (project: ProjectFormData) => Promise<void>
  project?: Project
  title: string
}

export function ProjectModal({ isOpen, onClose, onSave, project, title }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    projectKey: project?.projectKey || '',
    name: project?.name || '',
    description: project?.description || '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Atualiza o formulário quando o projeto a ser editado mudar
  useEffect(() => {
    if (project) {
      setFormData({
        projectKey: project.projectKey,
        name: project.name,
        description: project.description || '',
      })
    } else {
      setFormData({
        projectKey: '',
        name: '',
        description: '',
      })
    }
    setErrors({})
  }, [project])

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
    
    if (!formData.projectKey.trim()) {
      newErrors.projectKey = 'Chave do projeto é obrigatória'
    } else if (!/^[a-zA-Z0-9-_]+$/.test(formData.projectKey)) {
      newErrors.projectKey = 'Chave deve conter apenas letras, números, hífen e underscore'
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome do projeto é obrigatório'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)
    try {
      await onSave(formData)
      onClose()
      setFormData({ projectKey: '', name: '', description: '' })
    } catch (error) {
      console.error('Erro ao salvar projeto:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full flex flex-col max-h-[90vh]">
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
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Chave do Projeto *
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Identificador único usado na API e integração (ex: ecommerce-filters, catalog-v2)
            </p>
            <input
              type="text"
              value={formData.projectKey}
              onChange={(e) => setFormData({ ...formData, projectKey: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.projectKey ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="ex: meu-projeto"
              disabled={!!project} // Não permite editar chave de projeto existente
            />
            {errors.projectKey && (
              <p className="text-red-500 text-sm mt-1">{errors.projectKey}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Nome do Projeto *
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Nome amigável exibido no painel administrativo
            </p>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nome para exibição"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Descrição
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Informações adicionais sobre o projeto (opcional)
            </p>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Descrição opcional do projeto"
            />
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