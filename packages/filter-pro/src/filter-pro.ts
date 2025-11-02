import { LitElement, html, css, PropertyValues } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

export interface FilterOption {
  label: string
  value: string | number
}

export interface Filter {
  _id: string
  projectKey: string
  slug: string
  name: string
  type: 'select' | 'multiselect' | 'range' | 'text'
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
    static?: FilterOption[]
    dynamic?: {
      datasourceId: string
      template: Record<string, string>
    }
  }
  uiConfig?: {
    mode?: string
    placeholder?: string
    searchable?: boolean
    multiple?: boolean
  }
}

export interface FilterValues {
  [filterSlug: string]: any
}

export interface FilterProChangeEvent {
  filters: FilterValues
  query: any
}

@customElement('filter-pro')
export class FilterPro extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .filter-container {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      min-width: 200px;
      flex: 1;
    }

    .filter-label {
      font-weight: 600;
      color: #495057;
      margin-bottom: 8px;
      font-size: 14px;
    }

    .filter-input {
      padding: 8px 12px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
      background: white;
      transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
    }

    .filter-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .filter-input:disabled {
      background-color: #e9ecef;
      opacity: 0.6;
    }

    .range-inputs {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .range-separator {
      font-weight: 500;
      color: #6c757d;
    }

    .loading {
      opacity: 0.6;
      pointer-events: none;
    }

    .error {
      color: #dc3545;
      font-size: 12px;
      margin-top: 4px;
    }

    /* Searchable Select Styles */
    .searchable-select {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .search-input {
      border-bottom: 2px solid #007bff !important;
    }

    .searchable-select select {
      max-height: 200px;
      overflow-y: auto;
    }

    /* Multiselect Styles */
    .multiselect-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .multiselect-options {
      max-height: 250px;
      overflow-y: auto;
      border: 1px solid #ced4da;
      border-radius: 4px;
      background: white;
      padding: 4px;
    }

    .multiselect-option {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.15s ease-in-out;
      user-select: none;
    }

    .multiselect-option:hover {
      background-color: #f8f9fa;
    }

    .multiselect-option.selected {
      background-color: #e7f3ff;
    }

    .multiselect-option input[type="checkbox"] {
      margin-right: 8px;
      cursor: pointer;
    }

    .option-label {
      flex: 1;
      font-size: 14px;
      color: #495057;
    }

    .selected-count {
      font-size: 12px;
      color: #007bff;
      font-weight: 600;
      padding: 4px 8px;
      background: #e7f3ff;
      border-radius: 4px;
      text-align: center;
    }

    .no-results {
      padding: 16px;
      text-align: center;
      color: #6c757d;
      font-size: 14px;
      font-style: italic;
    }

    /* Super Filter Styles */
    .filter-with-super {
      display: flex;
      gap: 8px;
      align-items: flex-end;
    }

    .filter-with-super .filter-input-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .super-filter-btn {
      padding: 8px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      transition: all 0.2s ease;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
      flex-shrink: 0;
      height: 36px;
    }

    .super-filter-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.4);
    }

    .super-filter-btn:active {
      transform: translateY(0);
    }

    .super-filter-badge {
      background: #fff;
      color: #667eea;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 11px;
      margin-left: 4px;
      font-weight: 700;
    }

    /* Modal Overlay */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Modal Content */
    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #6c757d;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: all 0.2s ease;
    }

    .modal-close:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }

    .modal-search {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 16px;
      transition: border-color 0.2s ease;
    }

    .modal-search:focus {
      outline: none;
      border-color: #667eea;
    }

    .modal-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-control-btn {
      padding: 6px 12px;
      border: 1px solid #dee2e6;
      background: white;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-control-btn:hover {
      background: #f8f9fa;
      border-color: #adb5bd;
    }

    .modal-control-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
    }

    .modal-control-btn.active:hover {
      opacity: 0.9;
    }

    .modal-options-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .modal-option {
      display: flex;
      align-items: center;
      padding: 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .modal-option:hover {
      background-color: #f8f9fa;
    }

    .modal-option.selected {
      background-color: #e7f3ff;
    }

    .modal-option input[type="checkbox"] {
      margin-right: 10px;
      cursor: pointer;
      width: 16px;
      height: 16px;
    }

    .modal-option-label {
      flex: 1;
      font-size: 14px;
      color: #495057;
    }

    .modal-footer {
      padding: 16px 20px;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
      border-radius: 0 0 12px 12px;
    }

    .modal-footer-info {
      font-size: 13px;
      color: #6c757d;
    }

    .modal-footer-count {
      font-weight: 600;
      color: #667eea;
    }

    .modal-footer-actions {
      display: flex;
      gap: 10px;
    }

    .modal-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .modal-btn-cancel {
      background: white;
      color: #6c757d;
      border: 1px solid #dee2e6;
    }

    .modal-btn-cancel:hover {
      background: #f8f9fa;
    }

    .modal-btn-apply {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .modal-btn-apply:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }

    .modal-empty {
      text-align: center;
      padding: 40px 20px;
      color: #6c757d;
    }

    .modal-empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }
  `

  @property({ type: String })
  apiUrl = 'http://localhost:4000'

  @property({ type: String })
  projectKey = ''

  @property({ type: Object })
  initialValues: FilterValues = {}

  @state()
  private filters: Filter[] = []

  @state()
  private filterValues: FilterValues = {}

  @state()
  private loading = false

  @state()
  private error = ''

  @state()
  private optionsCache: Record<string, FilterOption[]> = {}

  @state()
  private searchTerms: Record<string, string> = {}

  @state()
  private superFilterOpen: string | null = null  // Slug do filtro com modal aberto

  @state()
  private superFilterSelections: Record<string, string[]> = {}  // Valores selecionados por filtro

  @state()
  private superFilterSearch: Record<string, string> = {}  // Termo de pesquisa por filtro

  @state()
  private superFilterShowOnlySelected: Record<string, boolean> = {}  // Mostra apenas selecionados

  connectedCallback() {
    super.connectedCallback()
    this.loadFilters()
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('projectKey')) {
      this.loadFilters()
    }
    if (changedProperties.has('initialValues')) {
      this.filterValues = { ...this.initialValues }
    }
  }

  private async loadFilters() {
    if (!this.projectKey) {
      console.warn('FilterPro: projectKey não definido')
      return
    }

    console.log('FilterPro: Carregando filtros...', {
      apiUrl: this.apiUrl,
      projectKey: this.projectKey
    })

    this.loading = true
    this.error = ''

    try {
      const url = `${this.apiUrl}/projects/${this.projectKey}/filters`
      console.log('FilterPro: Fetching from:', url)
      
      const response = await fetch(url)
      console.log('FilterPro: Response status:', response.status)
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const data = await response.json()
      console.log('FilterPro: Filtros recebidos:', data)
      console.log('FilterPro: Número de filtros:', data.length)
      
      this.filters = data.sort((a: Filter, b: Filter) => a.order - b.order)
      console.log('FilterPro: Filtros após sort:', this.filters)
      
      // Initialize filter values
      this.filterValues = { ...this.initialValues }
      
      // Load initial options for static filters
      await this.loadAllOptions()
      
      console.log('FilterPro: Filtros carregados com sucesso!')
      
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to load filters'
      console.error('FilterPro: Failed to load filters', error)
    } finally {
      this.loading = false
    }
  }

  private async loadAllOptions() {
    for (const filter of this.filters) {
      if (filter.type === 'select') {
        await this.loadOptionsForFilter(filter)
      }
    }
  }

  private async loadOptionsForFilter(filter: Filter) {
    const cacheKey = this.buildCacheKey(filter)
    
    console.log('📦 Loading options for filter:', filter.slug, {
      cacheKey,
      hasCache: !!this.optionsCache[cacheKey],
      optionsConfig: filter.optionsConfig,
      dependencies: filter.dependencies
    })
    
    if (this.optionsCache[cacheKey]) {
      console.log('✅ Using cached options for', filter.slug)
      return
    }

    if (filter.optionsConfig?.static) {
      console.log('📋 Loading static options for', filter.slug)
      this.optionsCache[cacheKey] = filter.optionsConfig.static
      this.requestUpdate()
      return
    }

    if (filter.optionsConfig?.dynamic) {
      try {
        const queryParams = new URLSearchParams()
        
        // Para cada dependência affected-by, adicionar o valor do filtro relacionado aos query params
        const hasAnyDependencyValue = filter.dependencies.some(dep => {
          if (dep.mode === 'affected-by') {
            return !!this.filterValues[dep.filterSlug]
          }
          return false
        })
        
        // Só adiciona params se houver pelo menos um valor de dependência
        if (hasAnyDependencyValue) {
          filter.dependencies.forEach(dep => {
            if (dep.mode === 'affected-by') {
              const sourceValue = this.filterValues[dep.filterSlug]
              if (sourceValue) {
                // Se for array (multiselect), enviar como string separada por vírgula
                const valueToSend = Array.isArray(sourceValue) 
                  ? sourceValue.join(',') 
                  : sourceValue
                queryParams.set(dep.filterSlug, valueToSend)
              }
            }
          })
        }

        const url = `${this.apiUrl}/projects/${this.projectKey}/filters/${filter.slug}/options?${queryParams}`
        console.log('🔍 FilterPro: Loading options for', filter.slug, {
          url,
          dependencies: filter.dependencies,
          currentValues: this.filterValues,
          hasAnyDependencyValue
        })
        
        const response = await fetch(url)
        
        if (response.ok) {
          const options = await response.json()
          console.log('✅ Loaded options for', filter.slug, ':', options)
          this.optionsCache[cacheKey] = options
          this.requestUpdate()
        } else {
          const errorBody = await response.text()
          console.error('❌ Failed to load options for', filter.slug, ':', {
            status: response.status,
            statusText: response.statusText,
            url,
            body: errorBody
          })
        }
      } catch (error) {
        console.error(`FilterPro: Failed to load options for ${filter.slug}`, error)
      }
    }
  }

  private buildCacheKey(filter: Filter): string {
    if (filter.optionsConfig?.static) {
      return `${filter.slug}_static`
    }
    
    if (filter.optionsConfig?.dynamic) {
      // Cache key baseado nos valores dos filtros dos quais este filtro depende
      const depValues = filter.dependencies
        .filter(dep => dep.mode === 'affected-by')
        .map(dep => `${dep.filterSlug}:${this.filterValues[dep.filterSlug] || 'empty'}`)
        .join('|')
      const cacheKey = `${filter.slug}_${depValues}`
      console.log('🔑 Cache key for', filter.slug, ':', cacheKey, {
        dependencies: filter.dependencies,
        filterValues: this.filterValues
      })
      return cacheKey
    }
    
    return filter.slug
  }

  // Super Filter Methods
  private openSuperFilter(filterSlug: string) {
    this.superFilterOpen = filterSlug
    // Inicializar seleções se não existir
    if (!this.superFilterSelections[filterSlug]) {
      this.superFilterSelections = {
        ...this.superFilterSelections,
        [filterSlug]: []
      }
    }
  }

  private closeSuperFilter() {
    if (this.superFilterOpen) {
      // Limpa o estado de "mostrar apenas selecionados" ao fechar
      this.superFilterShowOnlySelected = {
        ...this.superFilterShowOnlySelected,
        [this.superFilterOpen]: false
      }
    }
    this.superFilterOpen = null
  }

  private toggleSuperFilterOption(filterSlug: string, value: string) {
    const current = this.superFilterSelections[filterSlug] || []
    const newSelections = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    
    this.superFilterSelections = {
      ...this.superFilterSelections,
      [filterSlug]: newSelections
    }
  }

  private toggleSelectAllSuperFilter(filterSlug: string) {
    const filter = this.filters.find(f => f.slug === filterSlug)
    if (!filter) return
    
    const options = this.getFilterOptions(filter)
    const current = this.superFilterSelections[filterSlug] || []
    const allValues = options.map(opt => String(opt.value))
    
    // Se todos estão selecionados, desmarca todos. Senão, seleciona todos
    const allSelected = allValues.length > 0 && allValues.every(v => current.includes(v))
    
    this.superFilterSelections = {
      ...this.superFilterSelections,
      [filterSlug]: allSelected ? [] : allValues
    }
  }

  private toggleShowOnlySelected(filterSlug: string) {
    const currentState = this.superFilterShowOnlySelected[filterSlug] || false
    this.superFilterShowOnlySelected = {
      ...this.superFilterShowOnlySelected,
      [filterSlug]: !currentState
    }
  }

  private applySuperFilter(filterSlug: string) {
    const selections = this.superFilterSelections[filterSlug] || []
    
    // Se não tem seleção ou todos estão selecionados, considera como "todos"
    // Nesse caso, limpa o filtro (não envia query parameter)
    if (selections.length === 0) {
      this.onFilterChange(filterSlug, '')
    } else {
      // Envia apenas os selecionados
      this.onFilterChange(filterSlug, selections)
    }
    
    this.closeSuperFilter()
  }

  private async onFilterChange(filterSlug: string, value: any) {
    const newValues = { ...this.filterValues, [filterSlug]: value }
    this.filterValues = newValues

    // Clear dependent filter options cache
    this.clearDependentCache(filterSlug)
    
    // Reload options for dependent filters
    await this.loadDependentOptions(filterSlug)

    // Generate and emit query
    this.emitChange()
  }

  private clearDependentCache(changedFilterSlug: string) {
    this.filters.forEach(filter => {
      const isDependent = filter.dependencies.some(dep => dep.filterSlug === changedFilterSlug && dep.mode === 'affected-by')
      if (isDependent) {
        // Clear all cache entries for this filter
        Object.keys(this.optionsCache).forEach(key => {
          if (key.startsWith(filter.slug)) {
            delete this.optionsCache[key]
          }
        })
      }
    })
  }

  private async loadDependentOptions(changedFilterSlug: string) {
    const dependentFilters = this.filters.filter(filter =>
      filter.dependencies.some(dep => dep.filterSlug === changedFilterSlug && dep.mode === 'affected-by')
    )

    for (const filter of dependentFilters) {
      await this.loadOptionsForFilter(filter)
    }
  }

  private async generateQuery(): Promise<any> {
    try {
      const response = await fetch(`${this.apiUrl}/projects/${this.projectKey}/generate-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: this.filterValues,
          options: { format: 'mongodb' }
        })
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('FilterPro: Failed to generate query', error)
    }

    return null
  }

  private async emitChange() {
    const query = await this.generateQuery()
    
    const event = new CustomEvent<FilterProChangeEvent>('filter-change', {
      detail: {
        filters: this.filterValues,
        query
      },
      bubbles: true,
      composed: true
    })

    this.dispatchEvent(event)
  }

  private isFilterVisible(_filter: Filter): boolean {
    // Por enquanto, todos os filtros são visíveis
    // A funcionalidade de conditionalShow pode ser implementada futuramente
    return true
  }

  private getFilterOptions(filter: Filter): FilterOption[] {
    const cacheKey = this.buildCacheKey(filter)
    return this.optionsCache[cacheKey] || []
  }

  private renderFilter(filter: Filter) {
    if (!this.isFilterVisible(filter)) return ''

    const value = this.filterValues[filter.slug] || ''

    switch (filter.type) {
      case 'select':
        return this.renderSelectFilter(filter, value)
      case 'multiselect':
        return this.renderMultiselectFilter(filter, value)
      case 'range':
        return this.renderRangeFilter(filter, value)
      case 'text':
        return this.renderTextFilter(filter, value)
      default:
        return ''
    }
  }

  private renderSelectFilter(filter: Filter, value: string) {
    const options = this.getFilterOptions(filter)
    const isSearchable = filter.uiConfig?.searchable
    const hasSuperFilter = filter.uiConfig?.searchable  // Super filtro disponível quando searchable
    
    if (isSearchable && !hasSuperFilter) {
      return this.renderSearchableSelect(filter, value, options)
    }
    
    const selectedCount = this.superFilterSelections[filter.slug]?.length || 0
    const hasSelection = selectedCount > 0
    
    return html`
      <div class="filter-group">
        <label class="filter-label">${filter.name}</label>
        <div class="filter-with-super">
          ${hasSuperFilter ? html`
            <button
              class="super-filter-btn"
              @click=${() => this.openSuperFilter(filter.slug)}
              title="Abrir super filtro"
            >
              ⚡ Filtrar
              ${hasSelection ? html`<span class="super-filter-badge">${selectedCount}</span>` : ''}
            </button>
          ` : ''}
          <div class="filter-input-wrapper">
            <select
              class="filter-input"
              .value=${value}
              @change=${(e: Event) => {
                const target = e.target as HTMLSelectElement
                this.onFilterChange(filter.slug, target.value)
              }}
              ?disabled=${hasSelection}
            >
              <option value="">${hasSelection ? `${selectedCount} selecionado${selectedCount > 1 ? 's' : ''}` : 'Todos'}</option>
              ${!hasSelection ? options.map(option => html`
                <option value=${option.value} ?selected=${option.value === value}>
                  ${option.label}
                </option>
              `) : ''}
            </select>
          </div>
        </div>
      </div>
    `
  }

  private renderSearchableSelect(filter: Filter, value: string, allOptions: FilterOption[]) {
    const searchTerm = this.searchTerms[filter.slug] || ''
    const filteredOptions = searchTerm
      ? allOptions.filter(opt => 
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allOptions

    return html`
      <div class="filter-group">
        <label class="filter-label">${filter.name}</label>
        <div class="searchable-select">
          <input
            type="text"
            class="filter-input search-input"
            placeholder="🔍 Pesquisar..."
            .value=${searchTerm}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement
              this.searchTerms = {
                ...this.searchTerms,
                [filter.slug]: target.value
              }
              this.requestUpdate()
            }}
          />
          <select
            class="filter-input"
            size="5"
            .value=${value}
            @change=${(e: Event) => {
              const target = e.target as HTMLSelectElement
              this.onFilterChange(filter.slug, target.value)
              this.searchTerms = { ...this.searchTerms, [filter.slug]: '' }
              this.requestUpdate()
            }}
          >
            <option value="">Limpar seleção</option>
            ${filteredOptions.map(option => html`
              <option value=${option.value} ?selected=${option.value === value}>
                ${option.label}
              </option>
            `)}
          </select>
          ${filteredOptions.length === 0 ? html`
            <div class="no-results">Nenhum resultado encontrado</div>
          ` : ''}
        </div>
      </div>
    `
  }

  private renderMultiselectFilter(filter: Filter, value: string | string[]) {
    const options = this.getFilterOptions(filter)
    const selectedValues = Array.isArray(value) ? value : (value ? [value] : [])
    const isSearchable = filter.uiConfig?.searchable
    
    const searchTerm = this.searchTerms[filter.slug] || ''
    const filteredOptions = (isSearchable && searchTerm)
      ? options.filter(opt => 
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options

    return html`
      <div class="filter-group">
        <label class="filter-label">${filter.name}</label>
        <div class="multiselect-container">
          ${isSearchable ? html`
            <input
              type="text"
              class="filter-input search-input"
              placeholder="🔍 Pesquisar..."
              .value=${searchTerm}
              @input=${(e: Event) => {
                const target = e.target as HTMLInputElement
                this.searchTerms = {
                  ...this.searchTerms,
                  [filter.slug]: target.value
                }
                this.requestUpdate()
              }}
            />
          ` : ''}
          <div class="multiselect-options">
            ${filteredOptions.map(option => {
              const isSelected = selectedValues.includes(String(option.value))
              return html`
                <label class="multiselect-option ${isSelected ? 'selected' : ''}">
                  <input
                    type="checkbox"
                    .checked=${isSelected}
                    @change=${(e: Event) => {
                      const target = e.target as HTMLInputElement
                      let newValue: string[]
                      if (target.checked) {
                        newValue = [...selectedValues, String(option.value)]
                      } else {
                        newValue = selectedValues.filter(v => v !== String(option.value))
                      }
                      this.onFilterChange(filter.slug, newValue.length > 0 ? newValue : '')
                    }}
                  />
                  <span class="option-label">${option.label}</span>
                </label>
              `
            })}
          </div>
          ${selectedValues.length > 0 ? html`
            <div class="selected-count">
              ${selectedValues.length} selecionado${selectedValues.length > 1 ? 's' : ''}
            </div>
          ` : ''}
          ${filteredOptions.length === 0 ? html`
            <div class="no-results">Nenhum resultado encontrado</div>
          ` : ''}
        </div>
      </div>
    `
  }

  private renderRangeFilter(filter: Filter, value: any) {
    const isDate = filter.uiConfig?.mode === 'date'
    const inputType = isDate ? 'date' : 'number'
    const fromValue = value?.from || ''
    const toValue = value?.to || ''

    return html`
      <div class="filter-group">
        <label class="filter-label">${filter.name}</label>
        <div class="range-inputs">
          <input
            type=${inputType}
            class="filter-input"
            placeholder="De"
            .value=${fromValue}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement
              this.onFilterChange(filter.slug, {
                ...value,
                from: target.value
              })
            }}
          />
          <span class="range-separator">até</span>
          <input
            type=${inputType}
            class="filter-input"
            placeholder="Até"
            .value=${toValue}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement
              this.onFilterChange(filter.slug, {
                ...value,
                to: target.value
              })
            }}
          />
        </div>
      </div>
    `
  }

  private renderTextFilter(filter: Filter, value: string) {
    return html`
      <div class="filter-group">
        <label class="filter-label">${filter.name}</label>
        <input
          type="text"
          class="filter-input"
          placeholder=${filter.uiConfig?.placeholder || 'Digite...'}
          .value=${value}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement
            this.onFilterChange(filter.slug, target.value)
          }}
        />
      </div>
    `
  }

  private renderSuperFilterModal() {
    if (!this.superFilterOpen) return ''

    const filter = this.filters.find(f => f.slug === this.superFilterOpen)
    if (!filter) return ''

    const options = this.getFilterOptions(filter)
    const selections = this.superFilterSelections[this.superFilterOpen] || []
    const searchTerm = this.superFilterSearch[this.superFilterOpen] || ''
    const showOnlySelected = this.superFilterShowOnlySelected[this.superFilterOpen] || false
    
    // Primeiro filtra pela pesquisa
    let filteredOptions = searchTerm
      ? options.filter(opt => 
          opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(opt.value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      : options
    
    // Depois filtra por "apenas selecionados" se ativo
    if (showOnlySelected) {
      filteredOptions = filteredOptions.filter(opt => selections.includes(String(opt.value)))
    }

    // Verifica se todos os itens visíveis estão selecionados
    const allValues = options.map(opt => String(opt.value))
    const allSelected = allValues.length > 0 && allValues.every(v => selections.includes(v))

    return html`
      <div class="modal-overlay" @click=${() => this.closeSuperFilter()}>
        <div class="modal-content" @click=${(e: Event) => e.stopPropagation()}>
          <div class="modal-header">
            <div class="modal-title">🔍 Filtrar ${filter.name}</div>
            <button class="modal-close" @click=${() => this.closeSuperFilter()}>×</button>
          </div>

          <div class="modal-body">
            <input
              type="text"
              class="modal-search"
              placeholder="🔍 Pesquisar..."
              .value=${searchTerm}
              @input=${(e: Event) => {
                const target = e.target as HTMLInputElement
                this.superFilterSearch = {
                  ...this.superFilterSearch,
                  [this.superFilterOpen!]: target.value
                }
                this.requestUpdate()
              }}
            />

            <div class="modal-controls">
              <button
                class="modal-control-btn ${allSelected ? 'active' : ''}"
                @click=${() => this.toggleSelectAllSuperFilter(this.superFilterOpen!)}
              >
                ${allSelected ? '✕' : '✓'} ${allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              <button
                class="modal-control-btn ${showOnlySelected ? 'active' : ''}"
                @click=${() => this.toggleShowOnlySelected(this.superFilterOpen!)}
              >
                ${showOnlySelected ? '👁️' : '⚡'} Apenas selecionados
              </button>
            </div>

            ${filteredOptions.length > 0 ? html`
              <div class="modal-options-list">
                ${filteredOptions.map(option => {
                  const isSelected = selections.includes(String(option.value))
                  return html`
                    <label class="modal-option ${isSelected ? 'selected' : ''}">
                      <input
                        type="checkbox"
                        .checked=${isSelected}
                        @change=${() => this.toggleSuperFilterOption(this.superFilterOpen!, String(option.value))}
                      />
                      <span class="modal-option-label">${option.label}</span>
                    </label>
                  `
                })}
              </div>
            ` : html`
              <div class="modal-empty">
                <div class="modal-empty-icon">🔍</div>
                <div>Nenhum resultado encontrado</div>
              </div>
            `}
          </div>

          <div class="modal-footer">
            <div class="modal-footer-info">
              ${selections.length === 0 
                ? 'Todos selecionados' 
                : html`<span class="modal-footer-count">${selections.length}</span> de ${options.length} selecionados`
              }
            </div>
            <div class="modal-footer-actions">
              <button class="modal-btn modal-btn-cancel" @click=${() => this.closeSuperFilter()}>
                Cancelar
              </button>
              <button class="modal-btn modal-btn-apply" @click=${() => this.applySuperFilter(this.superFilterOpen!)}>
                Aplicar Filtro
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  render() {
    console.log('FilterPro: Renderizando...', {
      loading: this.loading,
      error: this.error,
      filtersLength: this.filters.length,
      filters: this.filters
    })

    if (this.loading) {
      return html`<div class="filter-container loading">Carregando filtros...</div>`
    }

    if (this.error) {
      return html`
        <div class="filter-container">
          <div class="error">Erro: ${this.error}</div>
        </div>
      `
    }

    if (!this.filters.length) {
      console.warn('FilterPro: Nenhum filtro para renderizar!')
      return html`<div class="filter-container">Nenhum filtro disponível</div>`
    }

    console.log('FilterPro: Renderizando', this.filters.length, 'filtros')
    return html`
      <div class="filter-container">
        ${this.filters.map(filter => this.renderFilter(filter))}
      </div>
      ${this.renderSuperFilterModal()}
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'filter-pro': FilterPro
  }
}