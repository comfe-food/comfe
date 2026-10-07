# Comfe — Take away

Website do **Comfe**: menu da semana, encomendas para recolha, pagamento MB WAY e painel de administração para o cozinheiro.

- **Stack:** Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (PostgreSQL + Auth + Realtime + Storage) · Vercel
- **Idioma:** português de Portugal
- **Princípio:** mobile first — o menu é a estrela

---

## 1. Instalação local

```bash
npm install
cp .env.example .env.local   # preenche as variáveis
npm run dev                  # http://localhost:3000
```

Comandos úteis:

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run sound` | Gera `public/sounds/new-order.mp3` |

Sem variáveis de ambiente o site arranca em modo "vazio" (menu vazio, sem BD) — útil para ver a UI, inútil para testar pedidos.

---

## 2. Variáveis de ambiente

Vê [`.env.example`](./.env.example). Resumo:

| Variável | Onde | Descrição |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | público | URL pública (SEO e webhooks) |
| `NEXT_PUBLIC_SUPABASE_URL` | público | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | público | Chave anon (segura porque o RLS está ativo) |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | Chave service_role. Nunca `NEXT_PUBLIC_`. |
| `IFTHENPAY_API_KEY` | servidor | Chave da API Ifthenpay (modo automático) |
| `IFTHENPAY_WEBHOOK_SECRET` | servidor | Segredo de validação do webhook |
| `IFTHENPAY_MBWAY_ENTITY` | servidor | Entidade/referência MB WAY |
| `COMFE_SECRET_KEY` | servidor | `openssl rand -base64 32` |
| `ORDER_RATE_LIMIT_IP` / `ORDER_RATE_LIMIT_PHONE` | servidor | Limites anti-abuso |

---

## 3. Supabase

1. Cria um projeto em [supabase.com](https://supabase.com).
2. Aplica as migrações, por ordem, no **SQL Editor** (ou com o CLI):
   ```bash
   supabase link --project-ref SEU_REF
   supabase db push
   ```
   Os ficheiros estão em [`supabase/migrations/`](./supabase/migrations):
   - `0001_schema.sql` — tabelas, tipos, índices, triggers
   - `0002_rls.sql` — Row Level Security
   - `0003_realtime.sql` — Realtime na tabela `orders`
   - `0004_seed.sql` — alergénios, categorias, pratos de exemplo, presets e `site_settings`
3. Cria um utilizador admin em **Authentication → Users → Add user** (email + palavra-passe) e, no SQL Editor:
   ```sql
   insert into public.profiles (id, role)
   values ('<uuid-do-utilizador>', 'admin');
   ```
4. **Storage:** cria o bucket público `dish-images` (Storage → New bucket → *Public bucket*). Políticas de escrita já vêm nas migrações.
5. Copia *Project URL* e *anon key* para o `.env.local`.

---

## 4. Deploy na Vercel

1. Importa o repositório em [vercel.com](https://vercel.com).
2. Adiciona todas as variáveis do `.env.example` em **Settings → Environment Variables** (`SUPABASE_SERVICE_ROLE_KEY` apenas em *Production*, nunca exposta ao cliente).
3. Deploy. O build funciona com Turbopack/Next 16 por omissão.
4. Depois do primeiro deploy, define `NEXT_PUBLIC_SITE_URL` com o domínio real (ex.: `https://comfe.pt`) — é usado nos metadados e no webhook.

---

## 5. MB WAY (Ifthenpay)

O pagamento passa por uma camada de abstração [`src/lib/payments/`](./src/lib/payments/) com a interface `PaymentProvider`.

- **`payment_mode = 'manual'` (modo inicial recomendado):** o pedido é criado como *A aguardar pagamento*; o cliente paga por MB WAY para o número do Comfe e o cozinheiro carrega em **Marcar como pago**. Não precisa de nenhuma chave.
- **`payment_mode = 'mbway_api'` (automático):** preenche `IFTHENPAY_API_KEY`, `IFTHENPAY_WEBHOOK_SECRET` e `IFTHENPAY_MBWAY_ENTITY`, e configura no painel Ifthenpay o *webhook* para:
  ```
  https://SEU-DOMINIO/api/payments/mbway/webhook
  ```
  O webhook é validado pelo hash e é idempotente (repetir a mesma notificação não muda o estado duas vezes).

O estado do pedido só passa a `new` (visível na cozinha) depois de pago.

---

## 6. Documentação

- [`DECISIONS.md`](./DECISIONS.md) — decisões e pressupostos
- [`GUIA-COZINHEIRO.md`](./GUIA-COZINHEIRO.md) — manual do painel, em linguagem simples
- [`supabase/migrations/`](./supabase/migrations) — esquema, RLS e seed

---

## 7. Estrutura

```
src/
  app/                 páginas (App Router)
    api/               Route Handlers (pedidos, webhook, admin)
    admin/             painel do cozinheiro
  components/          componentes React
  config/static.json   alergénios, textos fixos, SEO
  lib/
    supabase/          clientes browser/servidor/admin
    payments/          PaymentProvider (Ifthenpay + manual)
    business/          regras de negócio (horários, preços, validação)
  proxy.ts             proteção otimista das rotas /admin
supabase/migrations/   schema, RLS, realtime, seed
```

---

## Testes de migrações

```bash
npm i --no-save embedded-postgres pg
node scripts/test-migrations.mjs   # 35 verificações num PostgreSQL temporário
```
