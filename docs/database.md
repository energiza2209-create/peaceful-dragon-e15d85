# Banco de Dados — ENERGIZA CRM

## Visão Geral

Banco de dados relacional PostgreSQL hospedado no Supabase. Estrutura híbrida: colunas tipadas para dados estruturados + JSONB para dados flexíveis (itens de proposta).

## Tabelas

### 1. `negociacoes` — Propostas/Negociações

| Coluna | Tipo | Constraints | Descrição |
|--------|------|------------|-----------|
| `id` | TEXT | PRIMARY KEY | ID da proposta (ex: PROP-1234) |
| `data` | JSONB | NOT NULL | Dados completos da proposta |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT now() | Última atualização |
| `user_id` | TEXT | NOT NULL, DEFAULT '' | ID do usuário proprietário |

**Índices:**
- `negociacoes_updated_at_idx` em `updated_at DESC`

**Realtime:** Habilitado (publication `supabase_realtime`)

**Estrutura do JSONB `data`:**
```json
{
  "cliente": "Nome do Hospital",
  "contato": "Responsável",
  "projeto": "Equipamento",
  "status": "aberto|precificacao|enviada|negociacao|ganho|perdido",
  "categoria": "Calibração",
  "itens": [
    {
      "produtoId": "P001",
      "nome": "Produto",
      "descricao": "Descrição",
      "categoria": "Categoria",
      "preco": 850.00,
      "qtd": 1,
      "foto": "data:image/..."
    }
  ],
  "validade": "15 dias",
  "prazo": "30 dias úteis",
  "pagamento": "30/60 dias",
  "motivo_perda": "",
  "foto_produto": "data:image/...",
  "descricao_tecnica": "..."
}
```

### 2. `clients` — Clientes/Parceiros

| Coluna | Tipo | Constraints | Descrição |
|--------|------|------------|-----------|
| `id` | TEXT | PRIMARY KEY | UUID do cliente |
| `name` | TEXT | NOT NULL, DEFAULT '' | Nome fantasia |
| `razaoSocial` | TEXT | DEFAULT '' | Razão social |
| `cnpj` | TEXT | DEFAULT '' | CNPJ |
| `email` | TEXT | DEFAULT '' | Email |
| `phone` | TEXT | DEFAULT '' | Telefone |
| `address` | TEXT | DEFAULT '' | Endereço |
| `externalCode` | TEXT | DEFAULT '' | Código externo |
| `observations` | TEXT | DEFAULT '' | Observações |
| `lastSale` | TEXT | DEFAULT '' | Última venda |
| `totalSpent` | NUMERIC | DEFAULT 0 | Total gasto |
| `salesHistory` | JSONB | DEFAULT '[]' | Histórico de vendas |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Data de criação |
| `user_id` | TEXT | NOT NULL, DEFAULT '' | ID do usuário proprietário |

**Índices:**
- `idx_clients_name` em `name`
- `idx_clients_cnpj` em `cnpj`

### 3. `products` — Catálogo de Produtos

| Coluna | Tipo | Constraints | Descrição |
|--------|------|------------|-----------|
| `id` | UUID | DEFAULT gen_random_uuid(), PRIMARY KEY | ID do produto |
| `code` | TEXT | UNIQUE, NOT NULL | Código do produto |
| `name` | TEXT | NOT NULL, DEFAULT '' | Nome do produto |
| `ncm` | TEXT | DEFAULT '' | NCM |
| `last_price` | NUMERIC | DEFAULT 0 | Último preço |
| `total_bought` | NUMERIC | DEFAULT 0 | Total comprado |
| `supplier_name` | TEXT | DEFAULT '' | Nome do fornecedor |
| `nf_number` | TEXT | DEFAULT '' | Número da NF-e |
| `user_id` | TEXT | NOT NULL, DEFAULT '' | ID do usuário proprietário |

**Índices:**
- `idx_products_code` em `code`

### 4. `nfe_imports` — Importações de NF-e

| Coluna | Tipo | Constraints | Descrição |
|--------|------|------------|-----------|
| `nfId` | TEXT | PRIMARY KEY | Chave de acesso da NF-e |
| `nfNumber` | TEXT | NOT NULL, DEFAULT '' | Número da nota |
| `serie` | TEXT | DEFAULT '' | Série |
| `date` | TEXT | DEFAULT '' | Data de emissão |
| `supplierName` | TEXT | DEFAULT '' | Nome do emitente |
| `supplierCnpj` | TEXT | DEFAULT '' | CNPJ do emitente |
| `clientName` | TEXT | DEFAULT '' | Nome do destinatário |
| `clientCnpj` | TEXT | DEFAULT '' | CNPJ do destinatário |
| `productCount` | NUMERIC | DEFAULT 0 | Quantidade de itens |
| `importedAt` | TIMESTAMPTZ | DEFAULT now() | Data da importação |
| `items` | JSONB | DEFAULT '[]' | Itens da nota |
| `user_id` | TEXT | NOT NULL, DEFAULT '' | ID do usuário proprietário |

**Índices:**
- `idx_nfe_imports_date` em `date`
- `idx_nfe_imports_supplier` em `supplierName`

## Chaves de LocalStorage

| Chave | Constante | Propósito |
|-------|-----------|-----------|
| `metrolab_produtos` | `KEY_PROD` | Catálogo de produtos |
| `metrolab_propostas` | `KEY_PROP` | Propostas demo/fallback |
| `metrolab_seq` | `KEY_SEQ` | Sequência auto-increment |
| `duocrm-quotes` | `KEY_REAL` | Propostas reais (app antigo) |
| `energiza_user` | `KEY_USER` | Usuário atual |
| `energiza_clients` | `KEY_CLIENTS` | Clientes |
| `energiza_price_history` | `KEY_PRICE_HISTORY` | Histórico de preços |
| `energiza_nfe_imports` | `KEY_NFE_IMPORTS` | NF-e importadas |

## Regras de Sincronização

1. **Supabase é a fonte definitiva** quando online
2. **LocalStorage é espelho/offline fallback**
3. Toda escrita vai para Supabase imediatamente (upsert por linha)
4. Realtime empurra mudanças para outros dispositivos
5. Merge usa `updated_at` para conflitos (mais recente vence)

## Política de Migrations

- Todas as migrations devem ser idempotentes (`IF NOT EXISTS`)
- Nunca fazer `DROP TABLE` em produção
- Sempre testar em staging antes de produção
