# 📋 Schema Autocomplete - Datasources

## 🎯 Visão Geral

Implementamos um sistema inteligente de **autocomplete e validação** baseado no schema dos dados retornados pela API do datasource. Isso garante que os templates de mapeamento sejam configurados corretamente e evita erros de digitação.

---

## 🚀 Funcionalidades Implementadas

### 1. **Extração Automática do Schema**
Quando você testa a conexão de um datasource (REST API):
- O sistema faz a requisição real para a API
- Analisa o primeiro item retornado
- Extrai automaticamente o schema com todos os campos disponíveis
- Salva o schema junto com o datasource

**Exemplo de Schema Extraído:**
```json
{
  "id": { "_type": "string" },
  "name": { "_type": "string" },
  "country": { "_type": "string" },
  "flag": { "_type": "string" },
  "population": { "_type": "number" },
  "capital": { "_type": "string" }
}
```

### 2. **Painel de Campos Disponíveis**
No `DatasourceModal`, após testar a conexão com sucesso:
- Mostra uma seção "📋 Schema Detectado"
- Exibe todos os campos encontrados no formato JSON
- Confirma visualmente que o schema foi capturado

### 3. **Sugestões Inteligentes no Template**
No `FilterModal`, ao configurar um filtro com opções dinâmicas:
- Mostra um painel "📋 Campos Disponíveis no Datasource"
- Lista todos os campos que podem ser usados no template
- Permite clicar em um campo para adicioná-lo automaticamente ao template
- Usa `datalist` HTML para autocomplete nativo enquanto digita

**Campos Disponíveis:**
```
┌─────────────────────────────────────────────┐
│ 📋 Campos Disponíveis no Datasource:       │
│                                             │
│  [id]  [name]  [country]  [flag]           │
│  [population]  [capital]                    │
│                                             │
│ 💡 Clique em um campo para adicionar        │
└─────────────────────────────────────────────┘
```

### 4. **Validação Automática**
Antes de salvar o filtro:
- Verifica se todos os campos do template existem no schema
- Extrai campos dos templates como `{{country}}` → `country`
- Compara com os campos disponíveis no schema
- Mostra erro se algum campo não existir

**Mensagem de Erro:**
```
⚠️ Os seguintes campos não existem no schema do datasource: pais, cidade
```

### 5. **Autocomplete Nativo**
Nos inputs de valor do template:
- Usa HTML5 `<datalist>` para sugestões nativas
- Enquanto digita, mostra opções de campos válidos
- Funciona em todos os navegadores modernos

---

## 🔧 Implementação Técnica

### Backend
```typescript
// Model: Datasource.ts
const DatasourceSchema = new mongoose.Schema({
  projectKey: { type: String, required: true },
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  config: { type: mongoose.Schema.Types.Mixed },
  sampleSchema: { type: mongoose.Schema.Types.Mixed } // ✨ Novo campo
});
```

### Frontend - DatasourceModal
```typescript
// Função para extrair schema recursivamente
const extractSchema = (obj: any, maxDepth = 3): Record<string, any> => {
  // Analisa objeto/array recursivamente
  // Identifica tipos: string, number, boolean, object, array
  // Mantém estrutura aninhada até maxDepth
}

// Ao testar conexão com sucesso
const schema = extractSchema(sampleItem)
setFormData({ ...formData, sampleSchema: schema })
```

### Frontend - FilterModal
```typescript
// Extrai caminhos disponíveis do schema
const extractSchemaPaths = (schema: Record<string, any>, prefix = ''): string[] => {
  // Retorna lista flat de todos os caminhos
  // Ex: ['id', 'name', 'address.street', 'address.city']
}

// Validação no submit
const invalidFields: string[] = []
templateFields.forEach(field => {
  const match = field.value.match(/\{\{(.+?)\}\}/)
  if (match && !availablePaths.includes(match[1])) {
    invalidFields.push(match[1])
  }
})
```

---

## 📝 Fluxo de Uso

### Passo 1: Criar Datasource
1. Acesse "Datasources"
2. Clique em "Novo Datasource"
3. Configure a API:
   - URL: `https://restcountries.com/v3.1/all`
   - Método: GET
   - Response Path: (vazio)
4. Clique em "🔍 Testar Conexão"
5. ✅ Veja o preview dos dados
6. 📋 Confirme que o schema foi detectado
7. Clique em "Salvar"

### Passo 2: Criar Filtro com Datasource
1. Acesse a página de Filtros do projeto
2. Clique em "Novo Filtro"
3. Configure:
   - Nome: "País"
   - Slug: "country"
   - Tipo: "Seleção"
4. Escolha "Opções Dinâmicas"
5. Selecione o datasource criado
6. 📋 Veja os campos disponíveis aparecerem
7. Configure o Template:
   - Clique em "name" para adicionar `{{name}}`
   - Clique em "flag" para adicionar `{{flag}}`
   - Ou digite manualmente com autocomplete
8. Salve o filtro

### Passo 3: Validação Automática
Se você digitar um campo que não existe:
```
Template:
  label: {{nome_do_pais}}  ❌ Campo não existe
  value: {{codigo}}        ❌ Campo não existe
```

Você verá o erro:
```
⚠️ Os seguintes campos não existem no schema do datasource: nome_do_pais, codigo
```

---

## 🎨 Benefícios

### Para Desenvolvedores
- ✅ Evita erros de digitação nos templates
- ✅ Descobre campos disponíveis sem consultar documentação
- ✅ Feedback imediato sobre campos inválidos
- ✅ Autocomplete nativo do navegador

### Para a Aplicação
- ✅ Garante integridade dos dados
- ✅ Reduz bugs em produção
- ✅ Facilita manutenção
- ✅ Documentação automática da estrutura de dados

---

## 🔮 Possíveis Melhorias Futuras

1. **Validação em Tempo Real**
   - Destacar campos inválidos enquanto digita
   - Mostrar tooltip com campos sugeridos

2. **Schema Diff**
   - Comparar schema antigo vs novo
   - Alertar quando API mudar estrutura

3. **Preview de Dados**
   - Mostrar exemplo de como ficará o filtro
   - Renderizar opções reais baseadas no template

4. **Suporte a GraphQL**
   - Extrair schema de queries GraphQL
   - Sugestões baseadas no schema GraphQL

5. **Histórico de Schemas**
   - Salvar versões anteriores do schema
   - Detectar breaking changes na API

---

## 📚 Arquivos Modificados

- `packages/backend/src/models/Datasource.ts` - Adicionado campo `sampleSchema`
- `packages/backend/src/routes/datasources.ts` - Validação Zod atualizada
- `packages/admin/src/components/modals/DatasourceModal.tsx` - Extração e exibição de schema
- `packages/admin/src/components/modals/FilterModal.tsx` - Sugestões e validação de campos

---

## ✨ Demonstração

```
┌──────────────────────────────────────────────────────────┐
│  DatasourceModal - Teste de Conexão                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  URL: https://restcountries.com/v3.1/all                │
│  [🔍 Testar Conexão]                                     │
│                                                           │
│  ✅ Conexão bem-sucedida!                                │
│  Preview do primeiro item:                               │
│  ┌─────────────────────────────────────────────┐        │
│  │ {                                            │        │
│  │   "name": "Brazil",                          │        │
│  │   "flag": "🇧🇷",                              │        │
│  │   "population": 212559417                    │        │
│  │ }                                             │        │
│  └─────────────────────────────────────────────┘        │
│                                                           │
│  📋 Schema Detectado                                     │
│  ┌─────────────────────────────────────────────┐        │
│  │ {                                            │        │
│  │   "name": { "_type": "string" },            │        │
│  │   "flag": { "_type": "string" },            │        │
│  │   "population": { "_type": "number" }       │        │
│  │ }                                             │        │
│  └─────────────────────────────────────────────┘        │
│                                                           │
│  [Salvar]                                                │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  FilterModal - Template de Mapeamento                    │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Datasource: [countries-api ▼]                          │
│                                                           │
│  📋 Campos Disponíveis no Datasource:                   │
│  [name] [flag] [population]                              │
│  💡 Clique em um campo para adicioná-lo                  │
│                                                           │
│  Template:                                               │
│  ┌─────────────┬─────────────────────────────┐         │
│  │ label       │ {{name}}                     │ [Remover]│
│  │ value       │ {{name}}                     │ [Remover]│
│  │ emoji       │ {{flag}}                     │ [Remover]│
│  └─────────────┴─────────────────────────────┘         │
│                                                           │
│  [Adicionar Mapeamento]                                  │
│                                                           │
│  [Salvar Filtro]                                         │
└──────────────────────────────────────────────────────────┘
```

---

**Implementado com sucesso! 🎉**
