# FilterPro Web Component

Web Component para integração de filtros em aplicações externas.

## Instalação

```bash
npm install @filterpro/filter-pro
```

## Uso

### Em HTML

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module" src="./node_modules/@filterpro/filter-pro/dist/filter-pro.js"></script>
</head>
<body>
  <filter-pro 
    api-url="http://localhost:4000"
    project-key="demo-project">
  </filter-pro>

  <script>
    document.querySelector('filter-pro').addEventListener('filter-change', (event) => {
      const { filters, query } = event.detail;
      console.log('Filters:', filters);
      console.log('Query:', query);
    });
  </script>
</body>
</html>
```

### Em Angular

1. **Configure CUSTOM_ELEMENTS_SCHEMA**:

```typescript
// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
```

2. **Importe o Web Component**:

```typescript
// main.ts ou app.component.ts
import '@filterpro/filter-pro';
```

3. **Use no template**:

```html
<filter-pro 
  [attr.api-url]="apiUrl"
  [attr.project-key]="projectKey"
  (filter-change)="onFilterChange($event)">
</filter-pro>
```

4. **Manipule eventos**:

```typescript
export class AppComponent {
  apiUrl = 'http://localhost:4000';
  projectKey = 'demo-project';

  onFilterChange(event: any) {
    const { filters, query } = event.detail;
    // Use os filtros e query conforme necessário
  }
}
```

### Em React

```jsx
import { useEffect, useRef } from 'react';
import '@filterpro/filter-pro';

function FilterComponent() {
  const filterRef = useRef();

  useEffect(() => {
    const handleFilterChange = (event) => {
      const { filters, query } = event.detail;
      console.log('Filters:', filters);
      console.log('Query:', query);
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

## Propriedades

| Propriedade | Tipo | Padrão | Descrição |
|-------------|------|--------|-----------|
| `api-url` | string | `http://localhost:4000` | URL da API FilterPro |
| `project-key` | string | - | Chave do projeto (obrigatório) |
| `initial-values` | object | `{}` | Valores iniciais dos filtros |

## Eventos

### `filter-change`

Disparado quando os valores dos filtros mudam.

**Detail:**
```typescript
{
  filters: { [filterSlug: string]: any },
  query: any // Query MongoDB gerada
}
```

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Os arquivos serão gerados em `dist/`.