// Tipos de configuração para datasources

export interface RestApiConfig {
  baseUrl: string
  method: string
  headers?: Record<string, string>
  auth?: {
    type: 'bearer' | 'basic' | 'api_key'
    token?: string
    username?: string
    password?: string
    apiKey?: string
    headerName?: string
  }
  body?: string
  queryParams?: Record<string, string>
  responsePath?: string
}

export interface MongoDbConfig {
  connectionString: string
  database: string
  collection: string
  query?: string
  projection?: string
}

export interface SqlConfig {
  engine: 'postgres' | 'mysql' | 'mssql'
  host: string
  port: number
  database: string
  username: string
  password: string
  query: string
  ssl?: boolean
}

export interface StaticConfig {
  options: Array<{
    value: string
    label: string
  }>
}

export type DatasourceConfig = RestApiConfig | MongoDbConfig | SqlConfig | StaticConfig

export interface Datasource {
  _id: string
  projectKey: string
  id: string
  name: string
  type: 'rest_api' | 'mongodb' | 'sql' | 'static'
  config: DatasourceConfig
  enabled?: boolean
  syncConfig?: {
    enabled: boolean
    interval: '5m' | '15m' | '1h' | '6h' | '24h'
    externalCodeField?: string
    labelField?: string
    valueField?: string
  }
  lastSync?: {
    date: string
    status: 'success' | 'error'
    stats?: {
      recordsFound: number
      recordsAdded: number
      recordsUpdated: number
      recordsDisabled: number
    }
    error?: string
  }
  sampleSchema?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface DatasourceFormData {
  projectKey: string
  id: string
  name: string
  type: 'rest_api' | 'mongodb' | 'sql' | 'static'
  config: DatasourceConfig
  enabled?: boolean
  syncConfig?: {
    enabled: boolean
    interval: '5m' | '15m' | '1h' | '6h' | '24h'
    externalCodeField?: string
    labelField?: string
    valueField?: string
  }
  sampleSchema?: Record<string, any>
}
