# FilterPro

Sistema completo de filtros dinâmicos com backend em Fastify, interface administrativa em React e Web Component para integração externa.

## 🏗️ Arquitetura

```
FilterPro/
├── packages/
│   ├── backend/          # API Fastify + MongoDB
│   ├── admin/           # Interface administrativa React
│   └── filter-pro/      # Web Component para integração
├── infra/              # Docker Compose
└── examples/           # Exemplos de integração
```

## 🚀 Início Rápido

### 1. Prerequisitos

- Node.js 18+
- pnpm
- Docker & Docker Compose

### 2. Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd FilterPro

# Instale dependências
pnpm install

# Inicie os serviços
cd infra
docker-compose up -d

# Popule dados de exemplo
docker-compose exec backend pnpm seed
```

### 3. Acesso aos Serviços

- **Backend API**: http://localhost:4000
- **Admin Interface**: http://localhost:3000
- **Web Component Demo**: http://localhost:5173

## 📦 Componentes

### Backend API

Fastify 4.x com MongoDB, autenticação JWT e documentação Swagger.

**Principais endpoints:**
- `GET /projects` - Lista projetos
- `GET /projects/:key/filters` - Filtros do projeto
- `POST /projects/:key/generate-query` - Gera query MongoDB
- `GET /datasources/:id/options` - Opções dinâmicas

### Interface Admin

React SPA para gerenciar projetos, filtros e fontes de dados.

**Funcionalidades:**
- Dashboard com estatísticas
- CRUD de projetos e filtros
- Configuração de dependências entre filtros
- Preview de queries geradas

### Web Component

Componente reutilizável para integração em qualquer aplicação web.

**Características:**
- Framework agnóstico (funciona com Angular, React, Vue, etc.)
- Carregamento dinâmico de filtros
- Emissão de eventos com valores e queries
- Suporte a dependências entre filtros

## 🔧 Desenvolvimento

### Backend

```bash
cd packages/backend
pnpm dev          # Servidor de desenvolvimento
pnpm build        # Build para produção
pnpm test         # Executar testes
```

### Admin

```bash
cd packages/admin
pnpm dev          # Servidor de desenvolvimento
pnpm build        # Build para produção
pnpm preview      # Preview do build
```

### Web Component

```bash
cd packages/filter-pro
pnpm dev          # Servidor de desenvolvimento
pnpm build        # Build do componente
```

## 🌐 Integração do Web Component

### Angular

1. **Configure CUSTOM_ELEMENTS_SCHEMA**:

```typescript
// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
```

2. **Importe e use**:

```typescript
// main.ts
import '@filterpro/filter-pro';

// component.html
<filter-pro 
  [attr.api-url]="'http://localhost:4000'"
  [attr.project-key]="'demo-project'"
  (filter-change)="onFilterChange($event)">
</filter-pro>
```

### React

```jsx
import { useEffect, useRef } from 'react';
import '@filterpro/filter-pro';

function FilterComponent() {
  const filterRef = useRef();

  useEffect(() => {
    const handleFilterChange = (event) => {
      const { filters, query } = event.detail;
      // Use os dados conforme necessário
    };

    filterRef.current?.addEventListener('filter-change', handleFilterChange);
    return () => {
      filterRef.current?.removeEventListener('filter-change', handleFilterChange);
    };
  }, []);

  return (
    <filter-pro
      ref={filterRef}
      api-url="http://localhost:4000"
      project-key="demo-project"
    />
  );
}
```

### Vue.js

```vue
<template>
  <filter-pro
    :api-url="apiUrl"
    :project-key="projectKey"
    @filter-change="onFilterChange"
  />
</template>

<script>
import '@filterpro/filter-pro';

export default {
  data() {
    return {
      apiUrl: 'http://localhost:4000',
      projectKey: 'demo-project'
    };
  },
  methods: {
    onFilterChange(event) {
      const { filters, query } = event.detail;
      // Use os dados conforme necessário
    }
  }
};
</script>
```

## 📊 Modelo de Dados

### Projeto

```typescript
interface Project {
  _id: string;
  name: string;
  key: string;        // Identificador único
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Filtro

```typescript
interface Filter {
  _id: string;
  projectKey: string;
  slug: string;       // Identificador único no projeto
  name: string;
  type: 'select' | 'range' | 'text';
  active: boolean;
  order: number;
  dependencies: Array<{
    sourceFilterId: string;
    type: 'restrictOptions' | 'conditionalShow';
  }>;
  optionsConfig?: {
    static?: Array<{ label: string; value: string }>;
    dynamic?: {
      datasourceId: string;
      template: Record<string, string>;
    };
  };
  uiConfig?: {
    mode?: string;
    placeholder?: string;
  };
}
```

### Fonte de Dados

```typescript
interface Datasource {
  _id: string;
  projectKey: string;
  name: string;
  slug: string;
  type: 'mongodb' | 'api' | 'static';
  config: {
    // Configuração específica por tipo
    collection?: string;     // MongoDB
    url?: string;           // API
    data?: any[];          // Static
  };
  active: boolean;
}
```

## 🔒 Autenticação

O sistema usa JWT para autenticação. Endpoints protegidos requerem header:

```
Authorization: Bearer <token>
```

**Login padrão:**
- Email: admin@filterpro.com
- Senha: admin123

## 🧪 Testes

```bash
# Backend
cd packages/backend
pnpm test

# Admin (futuro)
cd packages/admin
pnpm test

# Web Component (futuro)
cd packages/filter-pro
pnpm test
```

## 🚢 Deploy

### Docker

```bash
# Build e execução
cd infra
docker-compose up --build

# Apenas produção
docker-compose -f docker-compose.prod.yml up
```

### Manual

1. **Backend**:
```bash
cd packages/backend
pnpm build
pnpm start
```

2. **Admin**:
```bash
cd packages/admin
pnpm build
# Servir arquivos estáticos
```

3. **Web Component**:
```bash
cd packages/filter-pro
pnpm build
# Publicar no npm ou CDN
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para dúvidas e suporte:

- Abra uma [issue](issues)
- Consulte a [documentação da API](http://localhost:4000/docs)
- Veja os [exemplos](examples/)
