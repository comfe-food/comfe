# Decisões e pressupostos

Registo das decisões tomadas durante a construção do site do Comfe.
Regra aplicada: quando algo é ambíuo, escolhe-se a opção mais simples e regista-se aqui.

## Ambiente e stack

- **Next.js 16 (App Router) + React 19 + Tailwind CSS 4.** O `create-next-app` instalou `cacheComponents: true`; mantivemo-lo e usámos `'use cache'` + `cacheTag()` para o menu/definições, com `updateTag()`/`revalidateTag()` no admin (ISR por tag, tal como pedido na secção 11).
- **`middleware.ts` não existe nesta versão — o ficheiro chama-se `src/proxy.ts`** e exporta `proxy()`. É aí que fazemos a verificação otimista das rotas `/admin`.
- **Sem Docker/Postgres local no ambiente de trabalho**: as migrações foram escritas para serem aplicadas no Supabase (cloud) via `supabase db push` ou colando no SQL Editor. Ficheiros em `/supabase/migrations`.
- **Idioma:** UI em pt-PT, código/variáveis/tabelas em inglês.

## Dados

- **Tudo o que o cozinheiro altera vive na BD** (pratos, opções, textos, contactos, horários, modo de pagamento). Em `src/config/static.json` ficam apenas: os 14 alergénios da UE, textos fixos de UI, os 3 passos de "Como funciona" e metadados de SEO.
- **Nada de contactos hardcoded**: telefone, WhatsApp, Instagram, horário e textos vêm sempre de `site_settings`.
- **Preços sempre recalculados no servidor.** O checkout envia apenas `dish_id` + `option_ids` + `quantidades`; o total é recomputado a partir da BD.
- **Snapshot por item do pedido** (`order_items.dish_name`, `unit_price`, `selected_options`): alterar o menu nunca altera pedidos antigos.

## Pedidos e estados

- `pending_payment` → pedido criado, à espera de pagamento MB WAY.
- `new` → pago/confirmado, aparece na cozinha (é este estado que dispara o som).
- `preparing` → `ready` → `completed` / `cancelled`.
- **Modo manual (`payment_mode = 'manual'`)**: o pedido entra como `pending_payment` com `payment_status = 'pending'` e o cozinheiro marca como pago. Foi a opção escolhida por omissão porque ainda não existem credenciais do agregador; é o modo documentado como "ativar primeiro".
- **Modo automático (`mbway_api`)**: Ifthenpay, com webhook validado por hash e tratamento idempotente.

## Admin

- Autenticação com **Supabase Auth (email/palavra-passe)** + cookie de sessão (`@supabase/ssr`). Papel `admin` guardado em `profiles` e verificado **no servidor** em todas as escritas.
- O áudio do navegador exige interação do utilizador: por isso o painel mostra um botão grande **"Ativar som"** e um botão de teste. O som repete a cada 10 s enquanto houver pedidos novos por abrir.
- "Manter ecrã ligado" usa a **Screen Wake Lock API**, com degradação silenciosa nos navegadores que não a suportam.

## Limites e segurança

- Telemóvel português validado com `^9\d{8}$`.
- Notas limitadas a 140 caracteres (item) e 500 (pedido).
- Honeypot invisível no checkout + limite de pedidos por IP e por telefone.
- RLS ativo em todas as tabelas; `orders` não é legível por anónimos — a criação e a consulta por `public_token` passam por Route Handlers com `service_role`.
- RGPD: só nome + telemóvel, aviso no checkout, página de Política de Privacidade e script de anonimização de pedidos com mais de 12 meses.

## Imagens e som

- Upload de fotos para o bucket `dish-images` (leitura pública, escrita só admin) com extensão e tipo validados; `next/image` serve com otimização.
- `public/sounds/new-order.wav` é um clipe curto gerado por script (`scripts/generate-sound.mjs`) para não depender de binários externos (ffmpeg) no ambiente de build. O som repete a cada 10 s enquanto houver pedidos por abrir.

## Base de dados (Fase 2)

- **`site_settings` ganhou a coluna `is_public boolean`** (o esquema do enunciado só tinha `key/value/description`). Em vez de uma lista de chaves fixa na política RLS, cada chave indica se o site público pode lê-la — mais simples de manter quando se acrescentam chaves.
- **`order_number` é `bigint generated always as identity`** em vez de `serial`: não pode ser editado e não depende de uma sequence separada.
- **O trigger `handle_new_user` cria automaticamente o perfil com `role = 'admin'`** quando surge um utilizador no `auth.users` (utilizadores são criados no painel do Supabase, não há registo público). Consequência importante: **o "Sign up" do Supabase Auth tem de continuar desativado**, senão qualquer pessoa criava conta de admin. Um utilizador *sem* perfil não tem qualquer acesso (testado).
- **Histórico de estados** passa a ser preenchido por trigger (`log_order_status_change`), incluindo `changed_by = auth.uid()`; mudanças de estado repetidas não duplicam entradas.
- **Tipos TypeScript**: `src/lib/database.types.ts` segue o formato do `database.types.ts` gerado pelo Supabase CLI, e `src/lib/types.ts` guarda as interfaces de domínio. Não usámos o CLI porque não há Docker no ambiente de trabalho.
- **Validação real das migrações**: `node scripts/test-migrations.mjs` sobe um PostgreSQL 18 efémero com um stub do ambiente Supabase (`auth`, `storage`, papéis, publication) e corre 35 verificações (schema, RLS, triggers, realtime, seed, idempotência). Correr com `npm i --no-save embedded-postgres pg`.
