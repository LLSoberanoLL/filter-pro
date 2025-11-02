import { useState } from 'react'
import { Button } from '../components/ui/button'

type Section = 'projects' | 'filters' | 'datasources' | 'query'

interface Endpoint {
  method: string
  path: string
  description: string
  body?: string
  response?: string
  example?: string
}

export function ApiDocs() {
  const [selectedSection, setSelectedSection] = useState<Section>('projects')

  const baseUrl = window.location.origin.replace(':5173', ':3001') + '/api'

  const sections: Record<Section, { title: string; icon: string; endpoints: Endpoint[] }> = {
    projects: {
      title: 'Projetos',
      icon: '📁',
      endpoints: [
        {
          method: 'GET',
          path: '/projects',
          description: 'Lista todos os projetos',
          response: `[
  {
    "_id": "507f1f77bcf86cd799439011",
    "projectKey": "meu-projeto",
    "name": "Meu Projeto",
    "description": "Descrição do projeto",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]`,
        },
        {
          method: 'POST',
          path: '/projects',
          description: 'Cria um novo projeto',
          body: `{
  "projectKey": "meu-projeto",
  "name": "Meu Projeto",
  "description": "Descrição opcional"
}`,
          response: `{
  "_id": "507f1f77bcf86cd799439011",
  "projectKey": "meu-projeto",
  "name": "Meu Projeto",
  "description": "Descrição opcional",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}`,
        },
        {
          method: 'GET',
          path: '/projects/:projectKey',
          description: 'Busca um projeto específico',
          response: `{
  "_id": "507f1f77bcf86cd799439011",
  "projectKey": "meu-projeto",
  "name": "Meu Projeto",
  "description": "Descrição do projeto",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}`,
        },
        {
          method: 'PUT',
          path: '/projects/:projectKey',
          description: 'Atualiza um projeto',
          body: `{
  "name": "Novo Nome",
  "description": "Nova descrição"
}`,
          response: `{
  "_id": "507f1f77bcf86cd799439011",
  "projectKey": "meu-projeto",
  "name": "Novo Nome",
  "description": "Nova descrição",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}`,
        },
        {
          method: 'DELETE',
          path: '/projects/:projectKey',
          description: 'Remove um projeto',
          response: `{
  "message": "Projeto removido com sucesso"
}`,
        },
      ],
    },
    filters: {
      title: 'Filtros',
      icon: '🔍',
      endpoints: [
        {
          method: 'GET',
          path: '/projects/:projectKey/filters',
          description: 'Lista todos os filtros de um projeto',
          response: `[
  {
    "_id": "507f1f77bcf86cd799439011",
    "projectKey": "meu-projeto",
    "slug": "country",
    "name": "País",
    "type": "select",
    "active": true,
    "order": 1,
    "optionsConfig": {
      "static": [
        { "label": "Brasil", "value": "BR" },
        { "label": "Estados Unidos", "value": "US" }
      ]
    },
    "dependencies": []
  }
]`,
        },
        {
          method: 'POST',
          path: '/projects/:projectKey/filters',
          description: 'Cria um novo filtro',
          body: `{
  "slug": "country",
  "name": "País",
  "type": "select",
  "active": true,
  "order": 1,
  "optionsConfig": {
    "static": [
      { "label": "Brasil", "value": "BR" },
      { "label": "Estados Unidos", "value": "US" }
    ]
  }
}`,
          response: `{
  "_id": "507f1f77bcf86cd799439011",
  "projectKey": "meu-projeto",
  "slug": "country",
  "name": "País",
  "type": "select",
  "active": true,
  "order": 1,
  "optionsConfig": { ... },
  "createdAt": "2024-01-01T00:00:00.000Z"
}`,
        },
        {
          method: 'GET',
          path: '/projects/:projectKey/filters/:slug',
          description: 'Busca um filtro específico',
        },
        {
          method: 'PUT',
          path: '/projects/:projectKey/filters/:slug',
          description: 'Atualiza um filtro',
        },
        {
          method: 'DELETE',
          path: '/projects/:projectKey/filters/:slug',
          description: 'Remove um filtro',
        },
      ],
    },
    datasources: {
      title: 'Datasources',
      icon: '🔗',
      endpoints: [
        {
          method: 'GET',
          path: '/projects/:projectKey/datasources',
          description: 'Lista todos os datasources de um projeto',
          response: `[
  {
    "_id": "507f1f77bcf86cd799439011",
    "projectKey": "meu-projeto",
    "id": "countries-api",
    "name": "API de Países",
    "type": "rest_api",
    "config": {
      "baseUrl": "https://api.example.com/countries",
      "method": "GET",
      "headers": {},
      "auth": { "type": "bearer", "token": "..." }
    },
    "enabled": true
  }
]`,
        },
        {
          method: 'POST',
          path: '/projects/:projectKey/datasources',
          description: 'Cria um novo datasource',
          body: `{
  "id": "countries-api",
  "name": "API de Países",
  "type": "rest_api",
  "config": {
    "baseUrl": "https://api.example.com/countries",
    "method": "GET",
    "headers": {},
    "auth": { "type": "bearer", "token": "seu-token" }
  },
  "enabled": true,
  "syncConfig": {
    "enabled": true,
    "interval": "1h",
    "externalCodeField": "code",
    "labelField": "name",
    "valueField": "code"
  }
}`,
        },
        {
          method: 'POST',
          path: '/datasources/:datasourceId/sync',
          description: 'Força sincronização manual de um datasource',
          response: `{
  "success": true,
  "stats": {
    "recordsFound": 195,
    "recordsAdded": 5,
    "recordsUpdated": 10,
    "recordsDisabled": 2
  }
}`,
        },
      ],
    },
    query: {
      title: 'Query Generator',
      icon: '⚡',
      endpoints: [
        {
          method: 'POST',
          path: '/projects/:projectKey/generate-query',
          description: 'Gera query MongoDB a partir dos filtros selecionados',
          body: `{
  "filters": {
    "country": "BR",
    "city": "sao-paulo",
    "price": { "min": 100, "max": 500 }
  }
}`,
          response: `{
  "mongoQuery": {
    "country": "BR",
    "city": "sao-paulo",
    "price": { "$gte": 100, "$lte": 500 }
  },
  "filters": {
    "country": "BR",
    "city": "sao-paulo",
    "price": { "min": 100, "max": 500 }
  }
}`,
          example: `// No frontend:
const filters = {
  country: 'BR',
  city: 'sao-paulo',
  price: { min: 100, max: 500 }
};

const response = await fetch(
  'http://localhost:3001/api/projects/meu-projeto/generate-query',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters })
  }
);

const { mongoQuery } = await response.json();

// Usar a query no MongoDB:
const results = await db.collection('products').find(mongoQuery).toArray();`,
        },
      ],
    },
  }

  const currentSection = sections[selectedSection]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Documentação da API</h1>
        <p className="text-muted-foreground">
          Referência completa dos endpoints da API FilterPro
        </p>
      </div>

      {/* URL Base */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">🌐 URL Base</h2>
        <code className="bg-white px-3 py-2 rounded text-sm font-mono block">
          {baseUrl}
        </code>
      </div>

      {/* Navegação de Seções */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Recursos da API</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(sections) as Section[]).map((key) => (
            <Button
              key={key}
              variant={selectedSection === key ? 'default' : 'outline'}
              onClick={() => setSelectedSection(key)}
              className="h-auto py-4 flex flex-col items-center gap-2"
            >
              <span className="text-3xl">{sections[key].icon}</span>
              <span>{sections[key].title}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Endpoints da Seção Selecionada */}
      <div className="space-y-6">
        {currentSection.endpoints.map((endpoint, index) => (
          <div key={index} className="bg-white rounded-lg border shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <span
                className={`px-3 py-1 rounded text-xs font-bold ${
                  endpoint.method === 'GET'
                    ? 'bg-blue-100 text-blue-800'
                    : endpoint.method === 'POST'
                    ? 'bg-green-100 text-green-800'
                    : endpoint.method === 'PUT'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {endpoint.method}
              </span>
              <code className="text-sm font-mono">{endpoint.path}</code>
            </div>

            <p className="text-muted-foreground mb-4">{endpoint.description}</p>

            {endpoint.body && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">📤 Request Body:</h4>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                  <code>{endpoint.body}</code>
                </pre>
              </div>
            )}

            {endpoint.response && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold mb-2">📥 Response:</h4>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                  <code>{endpoint.response}</code>
                </pre>
              </div>
            )}

            {endpoint.example && (
              <div>
                <h4 className="text-sm font-semibold mb-2">💡 Exemplo de Uso:</h4>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto">
                  <code>{endpoint.example}</code>
                </pre>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                const curl = `curl -X ${endpoint.method} \\
  "${baseUrl}${endpoint.path}" \\
  -H "Content-Type: application/json"${
    endpoint.body
      ? ` \\
  -d '${endpoint.body.replace(/\n/g, '').replace(/\s+/g, ' ')}'`
      : ''
  }`
                navigator.clipboard.writeText(curl)
                alert('Comando cURL copiado!')
              }}
            >
              📋 Copiar cURL
            </Button>
          </div>
        ))}
      </div>

      {/* Códigos de Status */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">📊 Códigos de Status HTTP</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold mb-1">200 OK</h3>
            <p className="text-sm text-muted-foreground">Requisição bem-sucedida</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold mb-1">201 Created</h3>
            <p className="text-sm text-muted-foreground">Recurso criado com sucesso</p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <h3 className="font-semibold mb-1">400 Bad Request</h3>
            <p className="text-sm text-muted-foreground">Dados inválidos na requisição</p>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <h3 className="font-semibold mb-1">404 Not Found</h3>
            <p className="text-sm text-muted-foreground">Recurso não encontrado</p>
          </div>
          <div className="border-l-4 border-yellow-500 pl-4">
            <h3 className="font-semibold mb-1">500 Internal Server Error</h3>
            <p className="text-sm text-muted-foreground">Erro no servidor</p>
          </div>
        </div>
      </div>

      {/* Autenticação (futuro) */}
      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
        <h2 className="text-lg font-semibold text-yellow-900 mb-3">🔐 Autenticação</h2>
        <p className="text-yellow-800 mb-3">
          Atualmente a API não requer autenticação. Em produção, recomendamos implementar:
        </p>
        <ul className="space-y-2 text-yellow-800 text-sm">
          <li>• API Keys para identificação de clientes</li>
          <li>• Rate limiting para evitar abuso</li>
          <li>• CORS configurado para domínios autorizados</li>
          <li>• HTTPS obrigatório em produção</li>
        </ul>
      </div>
    </div>
  )
}
