# Testes do Sistema de Filtros com Dependências Bidirecionais

## Visão Geral

Este conjunto de testes valida o comportamento completo do sistema de filtros dinâmicos com dependências bidirecionais (Country ↔ City).

## Estrutura dos Testes

### 1. `datasource-options.test.ts`
Testa o endpoint principal de proxy de datasources (`/datasources/:id/options`):

- ✅ Substituição de templates (`{{country}}`, `{{city}}`)
- ✅ Remoção de templates não resolvidos
- ✅ Filtros bidirecionais (Country → City e City → Country)
- ✅ Tratamento de erros (datasource não encontrado)
- ✅ Case-insensitive matching

**Cenários testados:**
```typescript
// Sem filtro: retorna todas as opções
GET /datasources/cities-api/options
→ [todas as cidades]

// Com filtro: retorna opções filtradas
GET /datasources/cities-api/options?country=BR
→ [cidades brasileiras]

// Filtro reverso
GET /datasources/countries-api/options?city=sao-paulo
→ [Brazil]
```

### 2. `mock-endpoints.test.ts`
Testa os endpoints mock que simulam APIs externas:

- ✅ `/mock-cities` - Retorna cidades (com filtro opcional de país)
- ✅ `/mock-countries` - Retorna países (com filtro opcional de cidade)
- ✅ Remoção de duplicatas
- ✅ Validação de dados

**Casos de teste:**
- Sem parâmetros → todas as opções
- Com parâmetro válido → opções filtradas
- Com parâmetro inválido → array vazio
- Case-insensitive matching

### 3. `e2e-bidirectional-filters.test.ts`
Testes de integração E2E que simulam a jornada completa do usuário:

#### Cenário 1: Estado Inicial
```
Usuário abre a página → ambos filtros mostram todas as opções
- Country: [Brazil, USA]
- City: [São Paulo, Rio, California, Texas, ...]
```

#### Cenário 2: Usuário Seleciona País Primeiro
```
Usuário seleciona "Brazil"
→ City filtra para: [São Paulo, Rio de Janeiro, Brasília, Belo Horizonte]
→ Country permanece: [Brazil]
```

#### Cenário 3: Usuário Seleciona Cidade Primeiro (Filtro Reverso)
```
Usuário seleciona "São Paulo"
→ Country filtra para: [Brazil]
→ City permanece: [São Paulo]
```

#### Cenário 4: Usuário Muda Seleção
```
1. Seleciona Brazil → City mostra cidades brasileiras
2. Muda para USA → City atualiza para cidades americanas
3. Limpa seleção → ambos mostram todas as opções
```

#### Cenário 5: Consistência de Dados
```
Valida que todas as cidades brasileiras mapeiam para Brazil
Valida que todas as cidades americanas mapeiam para USA
```

#### Cenário 6: Edge Cases
```
- País inválido → []
- Cidade inválida → []
- Case-insensitive → funciona
```

## Como Executar

### Executar todos os testes
```bash
cd packages/backend
npm test
```

### Executar com coverage
```bash
npm test -- --coverage
```

### Executar teste específico
```bash
npm test -- datasource-options.test.ts
```

### Watch mode (desenvolvimento)
```bash
npm test -- --watch
```

## Métricas de Coverage Esperadas

- **datasource-options.ts**: > 90%
- **mock-cities.ts**: 100%
- **mock-countries.ts**: 100%

## Comportamento Validado

### ✅ Filtros Dinâmicos
- Carregamento de opções via API
- Substituição de templates com valores de outros filtros
- Cache baseado em dependências

### ✅ Dependências Bidirecionais
- Country → City (forward)
- City → Country (reverse)
- Ambas direções funcionando simultaneamente

### ✅ Template Resolution
- `{{field}}` → valor do filtro
- Templates não resolvidos são removidos
- Permite APIs sem parâmetros (retorna tudo)

### ✅ Robustez
- Case-insensitive
- Tratamento de valores inválidos
- Sem duplicatas
- Retorno correto quando não há seleção

## Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│                    FilterPro Component                   │
│                                                          │
│  ┌──────────┐         ┌──────────┐                      │
│  │ Country  │◄───────►│   City   │                      │
│  │ Filter   │         │  Filter  │                      │
│  └────┬─────┘         └────┬─────┘                      │
│       │                    │                             │
└───────┼────────────────────┼─────────────────────────────┘
        │                    │
        ▼                    ▼
┌─────────────────────────────────────────────────────────┐
│              /datasources/:id/options                    │
│                                                          │
│  1. Busca datasource config no MongoDB                  │
│  2. Substitui templates com valores dos filtros         │
│  3. Remove templates não resolvidos                     │
│  4. Faz requisição para API (interna ou externa)        │
│                                                          │
│  ┌──────────────┐         ┌──────────────┐              │
│  │ /mock-cities │         │/mock-countries│             │
│  │ ?country=BR  │         │ ?city=sao-paulo│            │
│  └──────────────┘         └──────────────┘              │
└─────────────────────────────────────────────────────────┘
```

## Exemplos de Uso nos Testes

### Teste de Filtro Simples
```typescript
it('should filter cities when country=BR', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/datasources/cities-api/options?country=BR'
  });

  const cities = JSON.parse(response.body);
  expect(cities.map(c => c.value)).toContain('sao-paulo');
});
```

### Teste de Filtro Reverso
```typescript
it('should filter countries when city=sao-paulo', async () => {
  const response = await app.inject({
    method: 'GET',
    url: '/datasources/countries-api/options?city=sao-paulo'
  });

  const countries = JSON.parse(response.body);
  expect(countries[0].value).toBe('BR');
});
```

### Teste de Template Resolution
```typescript
it('should remove unresolved templates', async () => {
  // Sem query param, {{country}} não pode ser resolvido
  const response = await app.inject({
    method: 'GET',
    url: '/datasources/cities-api/options'
  });

  // Deve chamar API sem parâmetro, retornando tudo
  expect(response.statusCode).toBe(200);
  const cities = JSON.parse(response.body);
  expect(cities.length).toBeGreaterThan(4);
});
```

## Próximos Passos

- [ ] Testes de performance (carga)
- [ ] Testes de concorrência (múltiplos usuários)
- [ ] Testes de timeout e retry
- [ ] Testes de APIs externas reais (mock server)
- [ ] Testes de UI (Playwright/Cypress)
