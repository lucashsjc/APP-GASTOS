-- Horário das aulas da semana e semestres (encerrar o semestre e ver o histórico).
-- Rodar no Supabase: SQL Editor → New query → colar tudo → Run. Rodar depois do 010.
-- Pode rodar mais de uma vez: nada é duplicado nem apagado.

create table if not exists aulas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  disciplina_id uuid not null references disciplinas on delete cascade,
  -- 1 = segunda ... 7 = domingo.
  dia_semana integer not null check (dia_semana between 1 and 7),
  quantidade integer not null default 2 check (quantidade between 1 and 10),
  inicio time,
  criado_em timestamptz not null default now()
);

create index if not exists aulas_usuario on aulas (user_id);

alter table aulas enable row level security;

drop policy if exists "dono das aulas" on aulas;
create policy "dono das aulas" on aulas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on aulas to authenticated;

-- Semestre em que a disciplina foi encerrada (ex.: '2026/2'). Vazio = semestre atual.
alter table disciplinas add column if not exists semestre text;
