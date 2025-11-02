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
    
    if (isSearchable) {
      return this.renderSearchableSelect(filter, value, options)
    }
    
    return html`
      <div class="filter-group">
        <label class="filter-label">${filter.name}</label>
        <select
          class="filter-input"
          .value=${value}
          @change=${(e: Event) => {
            const target = e.target as HTMLSelectElement
            this.onFilterChange(filter.slug, target.value)
          }}
        >
          <option value="">Selecione...</option>
          ${options.map(option => html`
            <option value=${option.value} ?selected=${option.value === value}>
              ${option.label}
            </option>
          `)}
        </select>
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
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'filter-pro': FilterPro
  }
}