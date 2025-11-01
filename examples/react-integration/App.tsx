import React, { useEffect, useRef, useState } from 'react';
import '@filterpro/filter-pro';

// Declare o tipo do Web Component para TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'filter-pro': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'api-url'?: string;
        'project-key'?: string;
        'initial-values'?: string;
      };
    }
  }
}

function App() {
  const filterRef = useRef<HTMLElement>(null);
  const [filters, setFilters] = useState<any>(null);
  const [query, setQuery] = useState<any>(null);

  useEffect(() => {
    const handleFilterChange = (event: any) => {
      const { filters, query } = event.detail;
      setFilters(filters);
      setQuery(query);
      
      // Aqui você pode usar os filtros e query para:
      // - Fazer chamadas para sua API
      // - Atualizar listas ou tabelas
      // - Aplicar filtros em dados locais
      console.log('Filtros atualizados:', filters);
      console.log('Query MongoDB:', query);
    };

    const element = filterRef.current;
    element?.addEventListener('filter-change', handleFilterChange);
    
    return () => {
      element?.removeEventListener('filter-change', handleFilterChange);
    };
  }, []);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Integração FilterPro em React</h1>
      <p>Demonstração do Web Component FilterPro integrado em uma aplicação React.</p>
      
      <filter-pro
        ref={filterRef}
        api-url="http://localhost:4000"
        project-key="demo-project"
      />
      
      {filters && (
        <div style={{ 
          marginTop: '30px', 
          padding: '20px', 
          background: '#f8f9fa', 
          borderRadius: '4px',
          border: '1px solid #e9ecef'
        }}>
          <h3>Filtros Aplicados:</h3>
          <pre style={{ 
            background: 'white', 
            padding: '15px', 
            borderRadius: '4px',
            border: '1px solid #dee2e6',
            overflowX: 'auto'
          }}>
            {JSON.stringify(filters, null, 2)}
          </pre>
          
          <h3>Query MongoDB:</h3>
          <pre style={{ 
            background: 'white', 
            padding: '15px', 
            borderRadius: '4px',
            border: '1px solid #dee2e6',
            overflowX: 'auto'
          }}>
            {JSON.stringify(query, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;