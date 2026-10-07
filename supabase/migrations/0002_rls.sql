-- ===========================================================================
-- Comfe — 0002_rls.sql
-- Row Level Security: leitura pública do site, escrita apenas para admin.
-- Os pedidos NÃO são legíveis por anónimos: a criação e a consulta por
-- `public_token` passam pelos Route Handlers (service_role).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Privilegios (defensivos)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;

-- O site público apenas lê. Qualquer escrita de anónimos é proibida.
revoke insert, update, delete on all tables in schema public from anon;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- allergens (referência pública)
-- ---------------------------------------------------------------------------
alter table public.allergens enable row level security;
drop policy if exists allergens_select on public.allergens;
create policy allergens_select on public.allergens
  for select to anon, authenticated
  using (true);

drop policy if exists allergens_admin on public.allergens;
create policy allergens_admin on public.allergens
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
drop policy if exists categories_select on public.categories;
create policy categories_select on public.categories
  for select to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- dishes — visíveis se ativos e dentro da janela de disponibilidade
-- ---------------------------------------------------------------------------
alter table public.dishes enable row level security;

drop policy if exists dishes_select_public on public.dishes;
create policy dishes_select_public on public.dishes
  for select to anon, authenticated
  using (
    is_active
    and (available_from is null or available_from <= (now() at time zone 'Europe/Lisbon')::date)
    and (available_until is null or available_until >= (now() at time zone 'Europe/Lisbon')::date)
  );

drop policy if exists dishes_admin on public.dishes;
create policy dishes_admin on public.dishes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- option_groups / options
-- ---------------------------------------------------------------------------
alter table public.option_groups enable row level security;

drop policy if exists option_groups_select on public.option_groups;
create policy option_groups_select on public.option_groups
  for select to anon, authenticated
  using (true);

drop policy if exists option_groups_admin on public.option_groups;
create policy option_groups_admin on public.option_groups
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

alter table public.options enable row level security;

drop policy if exists options_select on public.options;
create policy options_select on public.options
  for select to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists options_admin on public.options;
create policy options_admin on public.options
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- note_presets
-- ---------------------------------------------------------------------------
alter table public.note_presets enable row level security;

drop policy if exists note_presets_select on public.note_presets;
create policy note_presets_select on public.note_presets
  for select to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists note_presets_admin on public.note_presets;
create policy note_presets_admin on public.note_presets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- site_settings — anónimos só veem as chaves marcadas como públicas
-- ---------------------------------------------------------------------------
alter table public.site_settings enable row level security;

drop policy if exists site_settings_select_public on public.site_settings;
create policy site_settings_select_public on public.site_settings
  for select to anon, authenticated
  using (is_public or public.is_admin());

drop policy if exists site_settings_admin on public.site_settings;
create policy site_settings_admin on public.site_settings
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- orders / order_items / order_status_history
-- Sem políticas de leitura para anon: o cliente só acede pelo Route Handler
-- que valida o `public_token`. O admin lê tudo; o service_role escreve.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;

drop policy if exists orders_select_admin on public.orders;
create policy orders_select_admin on public.orders
  for select to authenticated
  using (public.is_admin());

drop policy if exists orders_update_admin on public.orders;
create policy orders_update_admin on public.orders
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists orders_delete_admin on public.orders;
create policy orders_delete_admin on public.orders
  for delete to authenticated
  using (public.is_admin());

drop policy if exists order_items_select_admin on public.order_items;
create policy order_items_select_admin on public.order_items
  for select to authenticated
  using (public.is_admin());

drop policy if exists order_items_delete_admin on public.order_items;
create policy order_items_delete_admin on public.order_items
  for delete to authenticated
  using (public.is_admin());

drop policy if exists order_status_history_select_admin on public.order_status_history;
create policy order_status_history_select_admin on public.order_status_history
  for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: leitura pública do bucket `dish-images`, escrita só para admin
-- ---------------------------------------------------------------------------
-- O Supabase já ativa o RLS em `storage.objects`; garantimos mesmo assim,
-- sem falhar a migração caso a tabela pertença a outro papel.
do $$
begin
  alter table storage.objects enable row level security;
exception
  when insufficient_privilege then
    raise notice 'storage.objects: RLS já gerido pelo Supabase';
end $$;

drop policy if exists "dish-images public read" on storage.objects;
create policy "dish-images public read" on storage.objects
  for select to public
  using (bucket_id = 'dish-images');

drop policy if exists "dish-images admin insert" on storage.objects;
create policy "dish-images admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dish-images' and public.is_admin());

drop policy if exists "dish-images admin update" on storage.objects;
create policy "dish-images admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'dish-images' and public.is_admin())
  with check (bucket_id = 'dish-images' and public.is_admin());

drop policy if exists "dish-images admin delete" on storage.objects;
create policy "dish-images admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dish-images' and public.is_admin());
