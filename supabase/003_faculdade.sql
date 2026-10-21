-- Área Faculdade: disciplinas, notas, faltas e atividades.
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez: nada é duplicado nem apagado.

create table if not exists disciplinas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  cor text not null default '#4ea8f5',
  media_minima numeric(5, 2) not null default 6 check (media_minima between 0 and 100),
  limite_faltas integer check (limite_faltas is null or limite_faltas > 0),
  criado_em timestamptz not null default now()
);

create table if not exists notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  disciplina_id uuid not null references disciplinas on delete cascade,
  descricao text not null check (length(trim(descricao)) > 0),
  valor numeric(5, 2) not null check (valor between 0 and 100),
  peso numeric(5, 2) not null default 1 check (peso > 0),
  data date,
  criado_em timestamptz not null default now()
);

create table if not exists faltas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  disciplina_id uuid not null references disciplinas on delete cascade,
  data date not null,
  -- Aulas perdidas nesse dia.
  quantidade integer not null default 1 check (quantidade between 1 and 20),
  criado_em timestamptz not null default now()
);

create table if not exists atividades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  disciplina_id uuid references disciplinas on delete set null,
  titulo text not null check (length(trim(titulo)) > 0),
  entrega date not null,
  feita boolean not null default false,
  observacao text not null default '',
  criado_em timestamptz not null default now()
);

create index if not exists disciplinas_usuario on disciplinas (user_id);
create index if not exists notas_disciplina on notas (disciplina_id);
create index if not exists faltas_disciplina on faltas (disciplina_id);
create index if not exists atividades_usuario_entrega on atividades (user_id, entrega);

-- Row Level Security: cada usuário só enxerga e altera os próprios dados.
alter table disciplinas enable row level security;
alter table notas enable row level security;
alter table faltas enable row level security;
alter table atividades enable row level security;

drop policy if exists "dono das disciplinas" on disciplinas;
create policy "dono das disciplinas" on disciplinas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono das notas" on notas;
create policy "dono das notas" on notas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono das faltas" on faltas;
create policy "dono das faltas" on faltas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "dono das atividades" on atividades;
create policy "dono das atividades" on atividades
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Garante as permissões mesmo em projetos com "expor tabelas novas" desligado (o RLS continua valendo).
grant select, insert, update, delete on disciplinas, notas, faltas, atividades to authenticated;
