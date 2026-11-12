-- Cofrinho e compras futuras. O dinheiro do Nubank que foi guardado (ex.: na caixinha) sai do livre do mês, e o app mostra
-- quanto tem guardado no total. Também guarda a meta de quanto guardar por mês.
-- Rodar no Supabase: SQL Editor → New query → colar → Run. Pode rodar mais de uma vez.

create table if not exists guardados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  mes text not null check (mes ~ '^\d{4}-\d{2}$'),
  valor_centavos integer not null check (valor_centavos > 0),
  tipo text not null check (tipo in ('guardar', 'retirar')),
  descricao text not null default '',
  criado_em timestamptz not null default now()
);

alter table guardados enable row level security;

drop policy if exists "dono dos guardados" on guardados;
create policy "dono dos guardados" on guardados
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on guardados to authenticated;

create table if not exists cofrinho (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  meta_mensal integer check (meta_mensal is null or meta_mensal > 0)
);

alter table cofrinho enable row level security;

drop policy if exists "dono do cofrinho" on cofrinho;
create policy "dono do cofrinho" on cofrinho
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on cofrinho to authenticated;

-- Compras futuras (lista de desejos): o que quer comprar, com o valor, para planejar.
create table if not exists desejos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  valor_centavos integer not null check (valor_centavos > 0),
  criado_em timestamptz not null default now()
);

alter table desejos enable row level security;

drop policy if exists "dono dos desejos" on desejos;
create policy "dono dos desejos" on desejos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on desejos to authenticated;
