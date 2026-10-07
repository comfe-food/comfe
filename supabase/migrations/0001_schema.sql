-- ===========================================================================
-- Comfe — 0001_schema.sql
-- Tabelas, tipos, funções, triggers e índices.
-- Aplicar por ordem no SQL Editor do Supabase (ou via `supabase db push`).
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum (
    'pending_payment', -- criado, a aguardar pagamento MB WAY
    'new',             -- pago/confirmado, aguarda aceitação do cozinheiro
    'preparing',
    'ready',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Perfis de admin (ligados ao Supabase Auth)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Alergénios (14 da UE) — referência imutável
-- ---------------------------------------------------------------------------
create table if not exists public.allergens (
  code text primary key,
  name_pt text not null,
  sort_order int not null default 0
);

-- ---------------------------------------------------------------------------
-- Categorias do menu
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pratos
-- ---------------------------------------------------------------------------
create table if not exists public.dishes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  description text,
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  allergens text[] not null default '{}',
  is_active boolean not null default true,
  is_sold_out boolean not null default false,
  available_from date,
  available_until date,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Grupos de opções (ex.: "Acompanhamento") e opções
-- ---------------------------------------------------------------------------
create table if not exists public.option_groups (
  id uuid primary key default gen_random_uuid(),
  dish_id uuid not null references public.dishes(id) on delete cascade,
  name text not null,
  is_required boolean not null default false,
  min_select int not null default 0,
  max_select int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (min_select >= 0 and max_select >= 1 and min_select <= max_select)
);

create table if not exists public.options (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.option_groups(id) on delete cascade,
  name text not null,
  extra_price numeric(10,2) not null default 0 check (extra_price >= 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Atalhos de notas (chips: "+ molho", "- molho", ...)
-- ---------------------------------------------------------------------------
create table if not exists public.note_presets (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  order_number bigint generated always as identity,
  customer_name text not null,
  customer_phone text not null,
  pickup_time timestamptz,
  notes text,
  subtotal numeric(10,2) not null,
  total numeric(10,2) not null,
  status public.order_status not null default 'pending_payment',
  payment_status public.payment_status not null default 'pending',
  payment_method text not null default 'mbway',
  payment_reference text,
  paid_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Itens do pedido — SNAPSHOT dos dados do prato no momento da encomenda
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  dish_id uuid references public.dishes(id) on delete set null,
  dish_name text not null,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  selected_options jsonb not null default '[]',
  item_notes text,
  line_total numeric(10,2) not null
);

-- Histórico de estados (auditoria simples)
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Definições editáveis do site (chave/valor)
-- `is_public` marca as chaves que o site público pode ler sem autenticação.
-- ---------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  description text,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
create index if not exists dishes_active_sort_idx on public.dishes (is_active, sort_order);
create index if not exists dishes_availability_idx on public.dishes (available_from, available_until);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx on public.orders (customer_phone);
create index if not exists orders_ip_hash_idx on public.orders (ip_hash);
create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists option_groups_dish_idx on public.option_groups (dish_id);
create index if not exists options_group_idx on public.options (group_id);
create index if not exists order_status_history_order_idx on public.order_status_history (order_id);

-- ---------------------------------------------------------------------------
-- Funções e triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists dishes_set_updated_at on public.dishes;
create trigger dishes_set_updated_at
  before update on public.dishes
  for each row execute function public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- Verifica se o utilizador autenticado atual é admin.
-- SECURITY DEFINER: evita recursão de RLS em `profiles`.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- Regista automaticamente alterações de estado dos pedidos
create or replace function public.log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, status, changed_by)
    values (new.id, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists orders_log_status on public.orders;
create trigger orders_log_status
  after insert or update of status on public.orders
  for each row execute function public.log_order_status_change();

-- Cria o perfil automaticamente quando um utilizador é criado no Auth.
-- Só existem utilizadores de admin neste sistema (criados no painel Supabase).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Privilegios (mesmo modelo do Supabase: RLS faz o filtro de linhas)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant all on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
