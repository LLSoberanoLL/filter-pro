# QueryKey Feature

## Descrição

O campo `queryKey` permite personalizar a chave usada na query MongoDB, substituindo o `slug` padrão.

## Casos de Uso

### 1. Mapeamento de campos diferentes
- **UI**: Usuário vê filtro "Transportadora" (slug: `carrier`)
- **Query**: Busca no campo `carrierExternalCodes` do banco

### 2. Compatibilidade com APIs legadas
- Filtro novo no sistema mas query precisa usar campo antigo
- Evita refatoração de código existente

## Como Configurar

### Via MongoDB Compass

1. Abra o MongoDB Compass
2. Conecte ao banco: `mongodb://localhost:27017`
3. Database: `filterpro`
4. Collection: `filters`
5. Encontre o filtro desejado (ex: `carrier`)
6. Clique em "Edit Document"
7. Adicione o campo:
```json
{
  "slug": "carrier",
  "queryKey": "carrierExternalCodes",
  ...
}
```

### Via API (quando implementada)

```bash
curl -X PATCH "http://localhost:4000/projects/demo-project/filters/{filterId}" \
  -H "Content-Type: application/json" \
  -d '{"queryKey": "carrierExternalCodes"}'
```

## Exemplos

### Sem queryKey (padrão)

**Filtro:**
```json
{
  "slug": "carrier",
  "name": "Transportadora"
}
```

**Query gerada:**
```json
{
  "carrier": { "$in": ["000418", "000335"] }
}
```

### Com queryKey

**Filtro:**
```json
{
  "slug": "carrier",
  "queryKey": "carrierExternalCodes",
  "name": "Transportadora"
}
```

**Query gerada:**
```json
{
  "carrierExternalCodes": { "$in": ["000418", "000335"] }
}
```

## Compatibilidade

✅ Campo **opcional** - não quebra filtros existentes
✅ Se não definido, usa `slug` (comportamento padrão)
✅ Funciona com todos os tipos:
   - Arrays → `{ queryKey: { $in: [...] } }`
   - Ranges → `{ queryKey: { $gte: ..., $lte: ... } }`
   - Valores simples → `{ queryKey: "value" }`

## Limitações

⚠️ O `queryKey` afeta **apenas** a query final gerada
⚠️ **Não afeta** requisições de opções dependentes (essas usam `slug`)
⚠️ UI sempre mostra o `slug` original

## Implementação

**Backend:**
- `models/Filter.ts` - Schema com campo `queryKey`
- `routes/generateQuery.ts` - Usa `queryKey || slug`

**Frontend:**
- `filter-pro.ts` - Interface `Filter` inclui `queryKey?`
- Componente **não** usa `queryKey` (transparente para UI)
