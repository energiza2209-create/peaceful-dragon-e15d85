# Configuração Supabase — ENERGIZA CRM

## Projeto

- **URL:** `https://fhjihlndqfzzcqwoijmj.supabase.co`
- **Região:** (a definir no painel)
- **Plano:** Free tier

## Cliente JavaScript

```javascript
window.supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY,
  { realtime: { params: { eventsPerSecond: 10 } } }
);
```

## Autenticação

- **Provider:** Email/Password
- **Tabela profiles:** `public.profiles` (id, name, role)
- **Política padrão:** `auth.uid()::text = user_id`

## Tabelas

| Tabela | PK | Realtime | RLS |
|--------|-----|----------|-----|
| `negociacoes` | TEXT | Sim | auth.uid() |
| `clients` | TEXT | Não | auth.uid() |
| `products` | UUID | Não | auth.uid() |
| `nfe_imports` | TEXT | Não | auth.uid() |
| `profiles` | UUID | Não | auth.uid() |
| `atividades` | UUID | Não | auth.uid() |
| `emissoes` | UUID | Não | auth.uid() |

## Realtime

### Canais Ativos

| Canal | Tabela | Eventos |
|-------|--------|---------|
| `negociacoes-rt` | negociacoes | INSERT, UPDATE, DELETE |
| `clients-rt` | clients | INSERT, UPDATE, DELETE |
| `nfe-imports-rt` | nfe_imports | INSERT, UPDATE, DELETE |

### Configuração

```javascript
supabaseClient
  .channel('negociacoes-rt')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'negociacoes' }, callback)
  .subscribe();
```

## Storage

### Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| `proposal-photos` | Sim | Fotos de equipamentos |

### Policies

```sql
-- Leitura pública
CREATE POLICY "proposal_photos_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'proposal-photos');

-- Upload autenticado
CREATE POLICY "proposal_photos_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'proposal-photos' AND auth.uid() IS NOT NULL);
```

## Edge Functions

Nenhuma Edge Function implementada atualmente.

## Variáveis de Ambiente (Supabase)

| Variável | Valor |
|----------|-------|
| `SUPABASE_URL` | `https://fhjihlndqfzzcqwoijmj.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_xVVI4WzaOUt9YoXvgFCHTw_M_2SZp5k` |

> **Nota:** A anon key é pública por design. A segurança viene das RLS policies.

## Boas Práticas

1. Nunca usar `service_role` key no frontend
2. Sempre usar RLS em todas as tabelas
3. Usar `auth.uid()` nas policies, nunca `true`
4. Preferences upsert com `onConflict` para idempotência
5. Usar Realtime para sincronização em tempo real
6. Monitorar uso no painel do Supabase
