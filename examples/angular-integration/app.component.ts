import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <h1>Integração FilterPro em Angular</h1>
      <p>Demonstração do Web Component FilterPro integrado em uma aplicação Angular.</p>
      
      <filter-pro 
        [attr.api-url]="apiUrl"
        [attr.project-key]="projectKey"
        (filter-change)="onFilterChange($event)">
      </filter-pro>
      
      <div class="output" *ngIf="currentFilters">
        <h3>Filtros Aplicados:</h3>
        <pre>{{ currentFilters | json }}</pre>
        
        <h3>Query MongoDB:</h3>
        <pre>{{ currentQuery | json }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .output {
      margin-top: 30px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 4px;
      border: 1px solid #e9ecef;
    }
    
    pre {
      background: white;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #dee2e6;
      overflow-x: auto;
    }
  `]
})
export class AppComponent {
  apiUrl = 'http://localhost:4000';
  projectKey = 'demo-project';
  
  currentFilters: any = null;
  currentQuery: any = null;

  onFilterChange(event: any) {
    const { filters, query } = event.detail;
    
    this.currentFilters = filters;
    this.currentQuery = query;
    
    // Aqui você pode usar os filtros e query para:
    // - Fazer chamadas para sua API
    // - Atualizar listas ou tabelas
    // - Aplicar filtros em dados locais
    console.log('Filtros atualizados:', filters);
    console.log('Query MongoDB:', query);
  }
}