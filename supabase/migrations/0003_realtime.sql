-- ===========================================================================
-- Comfe — 0003_realtime.sql
-- Ativa Supabase Realtime em `orders` para o painel do cozinheiro.
-- ===========================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- Garante que as alterações antigas/eliminações chegam completas ao cliente
alter table public.orders replica identity full;
