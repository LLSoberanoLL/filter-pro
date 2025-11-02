import { useState } from 'react'
import { Button } from '../components/ui/button'

type Framework = 'html' | 'react' | 'angular'

export function Examples() {
  const [selectedFramework, setSelectedFramework] = useState<Framework>('html')

  const examples = {
    html: {
      title: 'HTML Puro (Vanilla JS)',
      description: 'Integração básica usando apenas HTML e JavaScript',
      code: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>FilterPro - HTML Integration</title>
    <script type="module" src="https://cdn.jsdelivr.net/npm/@your-org/filter-pro/dist/filter-pro.js"></script>
</head>
<body>
    <h1>Exemplo de Integração HTML</h1>
    
    <!-- Web Component FilterPro -->
    <filter-pro
        project-key="meu-projeto"
        api-url="http://localhost:3001/api"
    ></filter-pro>

    <script>
        const filterPro = document.querySelector('filter-pro');
        
        // Escutar mudanças de filtro
        filterPro.addEventListener('filtersChange', (event) => {
            console.log('Filtros alterados:', event.detail.filters);
            console.log('Query MongoDB:', event.detail.mongoQuery);
            
            // Fazer requisição com os filtros
            fetch('https://sua-api.com/dados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: event.detail.mongoQuery })
            })
            .then(res => res.json())
            .then(data => console.log('Dados filtrados:', data));
        });
    </script>
</body>
</html>`,
    },
    react: {
      title: 'React / Next.js',
      description: 'Integração com aplicações React',
      code: `import { useEffect, useRef, useState } from 'react';

// Declaração de tipos para TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'filter-pro': any;
    }
  }
}

function App() {
  const filterProRef = useRef<any>(null);
  const [filters, setFilters] = useState({});
  const [mongoQuery, setMongoQuery] = useState({});

  useEffect(() => {
    // Importar o Web Component
    import('@your-org/filter-pro');
    
    // Adicionar listener
    const handleFiltersChange = (event: CustomEvent) => {
      setFilters(event.detail.filters);
      setMongoQuery(event.detail.mongoQuery);
      
      // Fazer requisição com os filtros
      fetchData(event.detail.mongoQuery);
    };

    const element = filterProRef.current;
    if (element) {
      element.addEventListener('filtersChange', handleFiltersChange);
      
      return () => {
        element.removeEventListener('filtersChange', handleFiltersChange);
      };
    }
  }, []);

  const fetchData = async (query: any) => {
    const response = await fetch('https://sua-api.com/dados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    console.log('Dados filtrados:', data);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Integração FilterPro em React</h1>
      
      <filter-pro
        ref={filterProRef}
        project-key="meu-projeto"
        api-url="http://localhost:3001/api"
      />

      <div style={{ marginTop: '20px' }}>
        <h2>Estado Atual dos Filtros:</h2>
        <pre>{JSON.stringify(filters, null, 2)}</pre>
        
        <h2>Query MongoDB:</h2>
        <pre>{JSON.stringify(mongoQuery, null, 2)}</pre>
      </div>
    </div>
  );
}

export default App;`,
    },
    angular: {
      title: 'Angular',
      description: 'Integração com aplicações Angular',
      code: `// app.module.ts
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule, CommonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Importante!
  bootstrap: [AppComponent]
})
export class AppModule { }

// app.component.ts
import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';

@Component({
  selector: 'app-root',
  template: \`
    <div style="max-width: 1200px; margin: 0 auto; padding: 20px">
      <h1>Integração FilterPro em Angular</h1>
      
      <filter-pro
        #filterPro
        project-key="meu-projeto"
        api-url="http://localhost:3001/api"
      ></filter-pro>

      <div style="margin-top: 20px">
        <h2>Estado Atual dos Filtros:</h2>
        <pre>{{ filters | json }}</pre>
        
        <h2>Query MongoDB:</h2>
        <pre>{{ mongoQuery | json }}</pre>
      </div>
    </div>
  \`
})
export class AppComponent implements AfterViewInit {
  @ViewChild('filterPro', { static: false }) filterPro!: ElementRef;
  
  filters: any = {};
  mongoQuery: any = {};

  async ngAfterViewInit() {
    // Importar o Web Component
    await import('@your-org/filter-pro');
    
    // Adicionar listener
    this.filterPro.nativeElement.addEventListener('filtersChange', 
      (event: CustomEvent) => {
        this.filters = event.detail.filters;
        this.mongoQuery = event.detail.mongoQuery;
        
        // Fazer requisição com os filtros
        this.fetchData(event.detail.mongoQuery);
      }
    );
  }

  async fetchData(query: any) {
    const response = await fetch('https://sua-api.com/dados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    console.log('Dados filtrados:', data);
  }
}

// main.ts
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

// Importar CSS do FilterPro (opcional)
import '@your-org/filter-pro/dist/filter-pro.css';

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));`,
    },
  }

  const currentExample = examples[selectedFramework]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Exemplos de Integração</h1>
        <p className="text-muted-foreground">
          Aprenda como integrar o FilterPro em diferentes frameworks
        </p>
      </div>

      {/* Seletor de Framework */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Escolha seu Framework</h2>
        <div className="flex gap-3">
          <Button
            variant={selectedFramework === 'html' ? 'default' : 'outline'}
            onClick={() => setSelectedFramework('html')}
          >
            HTML / JavaScript
          </Button>
          <Button
            variant={selectedFramework === 'react' ? 'default' : 'outline'}
            onClick={() => setSelectedFramework('react')}
          >
            React / Next.js
          </Button>
          <Button
            variant={selectedFramework === 'angular' ? 'default' : 'outline'}
            onClick={() => setSelectedFramework('angular')}
          >
            Angular
          </Button>
        </div>
      </div>

      {/* Código de Exemplo */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">{currentExample.title}</h2>
          <p className="text-muted-foreground mt-1">{currentExample.description}</p>
        </div>

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="absolute top-3 right-3 z-10"
            onClick={() => {
              navigator.clipboard.writeText(currentExample.code)
              alert('Código copiado para a área de transferência!')
            }}
          >
            📋 Copiar Código
          </Button>
          
          <pre className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-x-auto">
            <code>{currentExample.code}</code>
          </pre>
        </div>
      </div>

      {/* Propriedades do Web Component */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Propriedades do Web Component</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-semibold">Propriedade</th>
                <th className="text-left py-2 px-3 font-semibold">Tipo</th>
                <th className="text-left py-2 px-3 font-semibold">Obrigatório</th>
                <th className="text-left py-2 px-3 font-semibold">Descrição</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-xs">project-key</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3">✅ Sim</td>
                <td className="py-2 px-3">Chave única do projeto (slug)</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-xs">api-url</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3">✅ Sim</td>
                <td className="py-2 px-3">URL base da API FilterPro</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-xs">theme</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3">❌ Não</td>
                <td className="py-2 px-3">Tema visual: 'light' | 'dark' (padrão: light)</td>
              </tr>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-2 px-3 font-mono text-xs">language</td>
                <td className="py-2 px-3">string</td>
                <td className="py-2 px-3">❌ Não</td>
                <td className="py-2 px-3">Idioma: 'pt-BR' | 'en' | 'es' (padrão: pt-BR)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Eventos do Web Component */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Eventos</h2>
        <div className="space-y-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold font-mono text-sm mb-1">filtersChange</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Disparado quando o usuário altera qualquer filtro
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono">
              <div>event.detail.filters → Objeto com valores dos filtros</div>
              <div>event.detail.mongoQuery → Query MongoDB pronta para uso</div>
            </div>
          </div>

          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold font-mono text-sm mb-1">ready</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Disparado quando o componente termina de carregar
            </p>
          </div>

          <div className="border-l-4 border-yellow-500 pl-4">
            <h3 className="font-semibold font-mono text-sm mb-1">error</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Disparado quando ocorre um erro (ex: projeto não encontrado)
            </p>
            <div className="bg-gray-50 p-3 rounded text-xs font-mono">
              <div>event.detail.message → Mensagem de erro</div>
            </div>
          </div>
        </div>
      </div>

      {/* Instalação */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">📦 Instalação</h2>
        <div className="space-y-3 text-blue-800">
          <div>
            <div className="text-sm font-medium mb-1">Via npm/yarn:</div>
            <pre className="bg-white p-3 rounded text-xs font-mono">
              npm install @your-org/filter-pro
              {'\n'}# ou{'\n'}
              yarn add @your-org/filter-pro
            </pre>
          </div>
          
          <div>
            <div className="text-sm font-medium mb-1">Via CDN:</div>
            <pre className="bg-white p-3 rounded text-xs font-mono overflow-x-auto">
              {'<script type="module" src="https://cdn.jsdelivr.net/npm/@your-org/filter-pro/dist/filter-pro.js"></script>'}
            </pre>
          </div>
        </div>
      </div>

      {/* Link para Documentação */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Precisa de mais ajuda?</h2>
        <p className="text-muted-foreground mb-4">
          Consulte a documentação completa da API para informações detalhadas sobre endpoints,
          autenticação e exemplos avançados.
        </p>
        <Button onClick={() => window.open('https://github.com/your-org/filter-pro/wiki', '_blank')}>
          📖 Ver Documentação Completa
        </Button>
      </div>
    </div>
  )
}
