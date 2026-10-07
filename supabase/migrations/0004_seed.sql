-- ===========================================================================
-- Comfe — 0004_seed.sql
-- Dados iniciais: 14 alergénios da UE, categorias, pratos de exemplo com
-- opções, atalhos de notas e `site_settings`.
-- Idempotente: podes voltar a correr sem apagar alterações feitas no painel.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 14 alergénios da UE
-- ---------------------------------------------------------------------------
insert into public.allergens (code, name_pt, sort_order) values
  ('gluten',      'Glúten',                          1),
  ('crustaceans', 'Crustáceos',                      2),
  ('eggs',        'Ovos',                            3),
  ('fish',        'Peixe',                           4),
  ('peanuts',     'Amendoins',                       5),
  ('soy',         'Soja',                            6),
  ('milk',        'Leite',                           7),
  ('nuts',        'Frutos de casca rígida',          8),
  ('celery',      'Aipo',                            9),
  ('mustard',     'Mostarda',                       10),
  ('sesame',      'Sésamo',                         11),
  ('sulphites',   'Dióxido de enxofre e sulfitos',   12),
  ('lupin',       'Tremoço',                         13),
  ('molluscs',    'Moluscos',                        14)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- site_settings (só insere chaves que ainda não existem)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value, description, is_public) values
  ('brand_name', '"Comfe"', 'Nome do estabelecimento', true),
  ('phone', '"938067719"', 'Telefone (9 dígitos, sem indicativo)', true),
  ('whatsapp_number', '"351938067719"', 'Número para o link wa.me', true),
  ('instagram_url', 'null', 'Link do Instagram (deixar vazio para esconder o botão)', true),
  ('opening_hours', '{"open":"17:00","close":"21:00","days":[0,1,2,3,4,5,6]}', 'Horário de pedidos', true),
  ('accepting_orders', 'true', 'Interruptor geral de pedidos', true),
  ('pickup_only_notice', '"Apenas recolha no local."', 'Aviso de recolha', true),
  ('hero_title', '"Comida caseira, feita com carinho"', 'Título da página inicial', true),
  ('hero_subtitle', '"Menu novo todas as semanas. Encomenda, paga com MB WAY e recolhe quentinho."', 'Subtítulo da página inicial', true),
  ('story_title', '"A história do Comfe"', 'Título da secção história', true),
  ('story_text', to_jsonb($$O Comfe nasceu de uma ideia simples: comer bem, em casa ou a caminho, sem complicações.

Cozinhamos como em casa — com ingredientes frescos, tempo para fazer as coisas direito e a certeza de que a comida tem de saber a alguma coisa. O menu muda todas as semanas para não ficar tudo parado e para aproveitarmos o que está melhor na época.

Fazemos poucos pratos por dia, porque cada um leva o nosso cuidado. Quando acaba, acaba: pede com tempo.$$::text), 'Texto da história', true),
  ('banner_message', 'null', 'Aviso temporário mostrado no topo do site (null = sem aviso)', true),
  ('payment_mode', '"manual"', '"manual" = cliente paga por MB WAY e a cozinha confirma | "mbway_api" = cobrança automática via Ifthenpay', false),
  ('pickup_slot_minutes', '15', 'Duração de cada intervalo de recolha', true),
  ('min_lead_time_minutes', '20', 'Antecedência mínima para a hora de recolha', true),
  ('mbway_payee', 'null', 'Número MB WAY para o modo manual (null = usar o telefone)', false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Categorias
-- ---------------------------------------------------------------------------
insert into public.categories (id, name, sort_order, is_active)
select * from (
  values
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'Pratos', 1, true),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'Sobremesas', 2, true),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'Bebidas', 3, true)
) as v(id, name, sort_order, is_active)
where not exists (select 1 from public.categories);

-- ---------------------------------------------------------------------------
-- Pratos de exemplo (aparecem só se a tabela estiver vazia)
-- ---------------------------------------------------------------------------
do $$
declare
  v_count int;
  v_monday date;
  v_sunday date;
  v_cat_pratos uuid;
  v_cat_sobremesas uuid;
  v_cat_bebidas uuid;
begin
  select count(*) into v_count from public.dishes;
  if v_count > 0 then
    return;
  end if;

  select date_trunc('week', current_date)::date into v_monday;
  v_sunday := v_monday + 6;

  select id into v_cat_pratos from public.categories where name = 'Pratos' limit 1;
  select id into v_cat_sobremesas from public.categories where name = 'Sobremesas' limit 1;
  select id into v_cat_bebidas from public.categories where name = 'Bebidas' limit 1;

  insert into public.dishes
    (id, category_id, name, description, price, image_url, allergens,
     is_active, is_sold_out, available_from, available_until, sort_order)
  values
    ('b0000000-0000-4000-8000-000000000001', v_cat_pratos,
     'Frango assado com arroz',
     'Meio frango assado no forno, arroz malandrinho e legumes salteados.',
     8.50, null, '{gluten,milk}',
     true, false, v_monday, v_sunday, 1),
    ('b0000000-0000-4000-8000-000000000002', v_cat_pratos,
     'Bitoque do dia',
     'Vazia grelhada, ovo a cavalo, arroz, batata frita e molho da casa.',
     9.00, null, '{eggs,milk,sulphites}',
     true, false, v_monday, v_sunday, 2),
    ('b0000000-0000-4000-8000-000000000003', v_cat_pratos,
     'Lasanha da avó',
     'Lasanha gratinada feita na casa, com ragu de carne e béchamel.',
     7.50, null, '{gluten,milk,eggs}',
     true, false, v_monday, v_sunday, 3),
    ('b0000000-0000-4000-8000-000000000004', v_cat_pratos,
     'Salada de grão com queijo feta',
     'Grão-de-bico, feta, tomate, cebola roxa e azeite com ervas.',
     6.50, null, '{milk,mustard}',
     true, false, v_monday, v_sunday, 4),
    ('b0000000-0000-4000-8000-000000000005', v_cat_sobremesas,
     'Brownie de chocolate',
     'Brownie húmido de chocolate negro, feito todos os dias.',
     2.50, null, '{gluten,eggs,milk,nuts}',
     true, false, v_monday, v_sunday, 5),
    ('b0000000-0000-4000-8000-000000000006', v_cat_bebidas,
     'Sumo natural de laranja',
     'Laranjas espremidas na hora, sem açúcar.',
     1.80, null, '{}',
     true, false, v_monday, v_sunday, 6);

  -- Grupos de opções -------------------------------------------------------
  insert into public.option_groups (id, dish_id, name, is_required, min_select, max_select, sort_order)
  values
    ('c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Acompanhamento', true, 1, 1, 1),
    ('c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Acompanhamento', true, 1, 1, 1),
    ('c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'Queres acrescentar?', false, 0, 2, 1);

  insert into public.options (id, group_id, name, extra_price, is_active, sort_order)
  values
    ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'Arroz',      0.00, true, 1),
    ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'Batata frita', 0.50, true, 2),
    ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'Salada',     0.00, true, 3),
    ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'Arroz',      0.00, true, 1),
    ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000002', 'Batata frita', 0.00, true, 2),
    ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000002', 'Salada',     0.50, true, 3),
    ('d0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000003', 'Pão de alho', 1.00, true, 1),
    ('d0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000003', 'Chávena de vinho tinto', 1.50, true, 2);
end $$;

-- ---------------------------------------------------------------------------
-- Atalhos de notas (chips)
-- ---------------------------------------------------------------------------
insert into public.note_presets (label, sort_order, is_active)
select * from (
  values
    ('+ molho', 1, true),
    ('− molho', 2, true),
    ('sem cebola', 3, true),
    ('sem picante', 4, true)
) as v(label, sort_order, is_active)
where not exists (select 1 from public.note_presets);
