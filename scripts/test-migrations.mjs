/**
 * Testa as migrações num PostgreSQL real, com um stub do ambiente Supabase
 * (esquema `auth`, `storage`, papéis anon/authenticated/service_role e o
 * publication `supabase_realtime`). Valida schema, RLS, triggers e seed.
 *
 * Uso:
 *   npm i --no-save embedded-postgres
 *   node scripts/test-migrations.mjs
 *
 * Não é preciso para correr o site — só para validar as migrações localmente.
 */
import EmbeddedPostgres from "embedded-postgres";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Client } from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIG_DIR = path.join(ROOT, "supabase", "migrations");

const STUB = `
-- ---- stub do ambiente Supabase ----
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text,
  public boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id) on delete cascade,
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);

create publication supabase_realtime;
alter table storage.objects enable row level security;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
grant select on auth.users to postgres;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
`;

const results = [];
function check(name, cond, extra = "") {
  results.push({ name, ok: !!cond, extra });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  → " + extra : ""}`);
}

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: path.join(ROOT, ".tmp-pgdata"),
    user: "postgres",
    password: "postgres",
    port: 55432,
    persistent: true,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("comfe");

  const c = new Client({
    host: "localhost",
    port: 55432,
    user: "postgres",
    password: "postgres",
    database: "comfe",
  });
  await c.connect();

  await c.query(STUB);

  const files = readdirSync(MIG_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = readFileSync(`${MIG_DIR}/${f}`, "utf8");
    try {
      await c.query(sql);
      console.log(`OK    ${f}`);
    } catch (e) {
      console.log(`ERROR ${f}: ${e.message}`);
      throw e;
    }
  }

  // ---------------------------------------------------------------- seed
  const a = await c.query("select count(*)::int as n from allergens");
  check("14 alergénios semeados", a.rows[0].n === 14, `n=${a.rows[0].n}`);

  const d = await c.query("select count(*)::int as n from dishes");
  check("6 pratos de exemplo", d.rows[0].n === 6, `n=${d.rows[0].n}`);

  const s = await c.query("select count(*)::int as n from site_settings");
  check("site_settings semeados", s.rows[0].n === 16, `n=${s.rows[0].n}`);

  const op = await c.query("select count(*)::int as n from options");
  check("opções semeadas", op.rows[0].n === 8, `n=${op.rows[0].n}`);

  // idempotência
  const seed = readFileSync(`${MIG_DIR}/0004_seed.sql`, "utf8");
  await c.query(seed);
  const d2 = await c.query("select count(*)::int as n from dishes");
  check("seed re-executado não duplica", d2.rows[0].n === 6);

  // ------------------------------------------------- utilizadores de teste
  const adminId = "e0000000-0000-4000-8000-00000000000a";
  const plainId = "e0000000-0000-4000-8000-00000000000b";
  await c.query("insert into auth.users (id, email) values ($1,$2), ($3,$4)", [
    adminId, "admin@comfe.pt", plainId, "user@comfe.pt",
  ]);
  await c.query("update profiles set role = 'admin' where id = $1", [adminId]);
  const prof = await c.query("select count(*)::int as n from profiles");
  check("trigger cria profiles", prof.rows[0].n === 2, `n=${prof.rows[0].n}`);

  // ------------------------------------------------------------------ RLS
  async function as(role, sub) {
    await c.query("reset role");
    await c.query("set request.jwt.claim.sub = ''");
    if (sub) await c.query(`set request.jwt.claim.sub = '${sub}'`);
    if (role) await c.query(`set role ${role}`);
  }

  await as("anon");
  let r = await c.query("select count(*)::int as n from dishes");
  check("anon vê o menu", r.rows[0].n === 6, `n=${r.rows[0].n}`);

  r = await c.query("select count(*)::int as n from site_settings");
  check("anon só vê settings públicos", r.rows[0].n === 14, `n=${r.rows[0].n}`);

  r = await c.query("select count(*)::int as n from site_settings where key = 'payment_mode'");
  check("anon não vê payment_mode", r.rows[0].n === 0);

  r = await c.query("select count(*)::int as n from orders");
  check("anon não lê pedidos", r.rows[0].n === 0);

  try {
    await c.query("insert into orders (customer_name, customer_phone, subtotal, total) values ('x','912345678',1,1)");
    check("anon não insere pedidos", false);
  } catch (e) {
    check("anon não insere pedidos", true, e.message.slice(0, 60));
  }

  try {
    await c.query("update dishes set price = 1 where id = 'b0000000-0000-4000-8000-000000000001'");
    check("anon não altera pratos", false);
  } catch (e) {
    check("anon não altera pratos", true, e.message.slice(0, 60));
  }

  // utilizador autenticado SEM perfil -> não é admin
  await as(null);
  await c.query("delete from profiles where id = $1", [plainId]);
  await as("authenticated", plainId);
  r = await c.query("select count(*)::int as n from orders");
  check("autenticado sem perfil não lê pedidos", r.rows[0].n === 0);
  r = await c.query("select count(*)::int as n from dishes");
  check("autenticado sem perfil não escreve (visibilidade ok)", r.rows[0].n === 6, `n=${r.rows[0].n}`);
  r = await c.query("update dishes set sort_order = 99 where id = 'b0000000-0000-4000-8000-000000000001'");
  check("autenticado sem perfil não altera pratos", r.rowCount === 0, `rowCount=${r.rowCount}`);
  r = await c.query("update site_settings set value = 'false'::jsonb where key = 'accepting_orders'");
  check("autenticado sem perfil não altera settings", r.rowCount === 0, `rowCount=${r.rowCount}`);

  await as("authenticated", adminId);
  r = await c.query("select count(*)::int as n from dishes");
  check("admin vê pratos", r.rows[0].n === 6);
  r = await c.query("update dishes set price = 9.99 where id = 'b0000000-0000-4000-8000-000000000001'");
  check("admin altera pratos", r.rowCount === 1);
  r = await c.query("update site_settings set value = 'false'::jsonb where key = 'accepting_orders'");
  check("admin altera settings", r.rowCount === 1);
  await c.query("update site_settings set value = 'true'::jsonb where key = 'accepting_orders'");
  await c.query("update dishes set price = 8.50 where id = 'b0000000-0000-4000-8000-000000000001'");
  r = await c.query("select count(*)::int as n from profiles");
  check("admin vê perfis", r.rows[0].n === 1, `n=${r.rows[0].n}`);

  // prato fora da janela de disponibilidade fica invisível para o público
  await c.query(`update dishes set available_from = current_date + 7 where id = 'b0000000-0000-4000-8000-000000000006'`);
  await as("anon");
  r = await c.query("select count(*)::int as n from dishes");
  check("prato agendado para a semana seguinte não aparece", r.rows[0].n === 5, `n=${r.rows[0].n}`);
  await as("authenticated", adminId);
  r = await c.query("select count(*)::int as n from dishes");
  check("admin vê o prato agendado", r.rows[0].n === 6);
  await c.query(`update dishes set available_from = current_date - 2 where id = 'b0000000-0000-4000-8000-000000000006'`);

  // --------------------------------------------------- criação de pedidos
  await as(null);
  const order = await c.query(
    `insert into orders (customer_name, customer_phone, subtotal, total, status, payment_status)
     values ('Maria Silva', '912345678', 9.00, 9.00, 'new', 'paid')
     returning id, public_token, order_number, status`,
  );
  const orderId = order.rows[0].id;
  check("service_role cria pedido", !!orderId);
  check("public_token gerado", (order.rows[0].public_token ?? "").length === 24, order.rows[0].public_token);
  check("estado inicial do pedido", order.rows[0].status === "new");

  await c.query(
    `insert into order_items (order_id, dish_id, dish_name, unit_price, quantity, selected_options, item_notes, line_total)
     values ($1, 'b0000000-0000-4000-8000-000000000001', 'Frango assado com arroz', 9.00, 1,
             '[{"group":"Acompanhamento","option":"Batata frita","extra_price":0.5}]'::jsonb, '+ molho', 9.00)`,
    [orderId],
  );

  // histórico automático
  r = await c.query("select status from order_status_history where order_id = $1", [orderId]);
  check("trigger regista estado inicial", r.rows.length === 1 && r.rows[0].status === "new");

  await c.query("update orders set status = 'preparing' where id = $1", [orderId]);
  r = await c.query("select status from order_status_history where order_id = $1 order by created_at", [orderId]);
  check("trigger regista transição de estado", r.rows.length === 2 && r.rows[1].status === "preparing", JSON.stringify(r.rows));

  await c.query("update orders set status = 'preparing' where id = $1", [orderId]);
  r = await c.query("select count(*)::int as n from order_status_history where order_id = $1", [orderId]);
  check("sem histórico duplicado quando o estado não muda", r.rows[0].n === 2, `n=${r.rows[0].n}`);

  await as("authenticated", adminId);
  r = await c.query("select count(*)::int as n from orders");
  check("admin lê pedidos", r.rows[0].n === 1);
  r = await c.query("update orders set status = 'ready' where id = $1", [orderId]);
  check("admin muda estado", r.rowCount === 1);
  r = await c.query("select changed_by from order_status_history where order_id = $1 order by created_at desc limit 1", [orderId]);
  check("histórico guarda quem alterou", r.rows[0].changed_by === adminId, String(r.rows[0].changed_by));

  await as("anon");
  r = await c.query("select count(*)::int as n from order_items where order_id = $1", [orderId]);
  check("anon não lê itens do pedido", r.rows[0].n === 0);

  // ------------------------------------------------------------- realtime
  r = await c.query(
    `select count(*)::int as n from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders'`,
  );
  check("orders no publication realtime", r.rows[0].n === 1);

  // ---------------------------------------------------------------- storage
  await c.query("insert into storage.buckets (id, name, public) values ('dish-images','dish-images', true)");
  await as("anon");
  try {
    await c.query(`insert into storage.objects (bucket_id, name) values ('dish-images','x.jpg')`);
    check("anon não escreve no bucket", false);
  } catch (e) {
    check("anon não escreve no bucket", true, e.message.slice(0, 60));
  }
  await as("authenticated", adminId);
  try {
    await c.query(`insert into storage.objects (bucket_id, name) values ('dish-images','x.jpg')`);
    check("admin escreve no bucket", true);
  } catch (e) {
    check("admin escreve no bucket", false, e.message.slice(0, 80));
  }

  await as(null);
  await c.query("reset role");
  await c.end();
  await pg.stop();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} verificações passaram`);
  if (failed.length) {
    console.log("FALHAS:", failed.map((f) => f.name).join(" | "));
    process.exit(1);
  }
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
