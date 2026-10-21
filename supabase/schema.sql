-- Banco de dados do App de Gastos (Nubank e Caju).
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez: nada é duplicado nem apagado.
--
-- Dinheiro em centavos (integer), datas como date e meses como texto AAAA-MM.

-- Gastos "todo mês". As ocorrências de cada mês são calculadas pelo app, sem uma linha por mês.
create table if not exists recorrencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  aba text not null check (aba in ('nubank', 'caju')),
  forma text check (forma in ('credito', 'debito')),
  descricao text not null check (length(trim(descricao)) > 0),
  valor_centavos integer not null check (valor_centavos > 0),
  dia smallint not null check (dia between 1 and 31),
  categoria text not null default 'Outros',
  inicio text not null check (inicio ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  fim text check (fim ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  criado_em timestamptz not null default now(),
  -- Crédito/débito só existe no Nubank.
  check (aba = 'nubank' or forma is null),
  check (fim is null or fim >= inicio)
);

create table if not exists gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  aba text not null check (aba in ('nubank', 'caju')),
  forma text check (forma in ('credito', 'debito')),
  descricao text not null check (length(trim(descricao)) > 0),
  valor_centavos integer not null check (valor_centavos > 0),
  data date not null,
  categoria text not null default 'Outros',
  tipo text not null default 'unico' check (tipo in ('unico', 'certo_unico', 'parcela')),
  -- Ajuste à mão de uma ocorrência de "todo mês" (ex.: marcada como caída).
  recorrencia_id uuid references recorrencias on delete cascade,
  -- Liga as parcelas de uma mesma compra.
  grupo_id uuid,
  parcela_numero smallint,
  parcela_total smallint,
  caiu_manual boolean,
  criado_em timestamptz not null default now(),
  check (aba = 'nubank' or forma is null),
  check (
    (tipo = 'parcela' and parcela_numero between 1 and parcela_total and grupo_id is not null)
    or (tipo <> 'parcela' and parcela_numero is null and parcela_total is null)
  )
);

-- O valor recebido no mês (Nubank): um por mês.
create table if not exists recebidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  aba text not null default 'nubank' check (aba = 'nubank'),
  mes text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  valor_centavos integer not null check (valor_centavos >= 0),
  criado_em timestamptz not null default now(),
  unique (user_id, mes)
);

-- Depósitos do benefício no Caju (sem dia fixo).
create table if not exists depositos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  aba text not null default 'caju' check (aba = 'caju'),
  data date not null,
  valor_centavos integer not null check (valor_centavos > 0),
  criado_em timestamptz not null default now()
);

create index if not exists gastos_usuario_data on gastos (user_id, data);
create index if not exists gastos_recorrencia on gastos (recorrencia_id);
create index if not exists gastos_grupo on gastos (grupo_id);
create index if not exists recorrencias_usuario on recorrencias (user_id);
create index if not exists depositos_usuario_data on depositos (user_id, data);

-- Row Level Security: cada usuário só enxerga e altera os próprios dados.
alter table gastos enable row level security;
alter table recorrencias enable row level security;
alter table recebidos enable row level security;
alter table depositos enable row level security;

drop policy if exists "dono dos gastos" on gastos;
create policy "dono dos gastos" on gastos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono das recorrencias" on recorrencias;
create policy "dono das recorrencias" on recorrencias
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono dos recebidos" on recebidos;
create policy "dono dos recebidos" on recebidos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono dos depositos" on depositos;
create policy "dono dos depositos" on depositos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
