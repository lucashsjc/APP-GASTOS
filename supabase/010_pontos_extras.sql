-- Pontos extras (ex.: SEAU e ACI) que somam na média de um bimestre em todas as matérias, e a média
-- da faculdade em 5. Rodar no Supabase: SQL Editor → New query → colar tudo → Run.
-- Pode rodar mais de uma vez: nada é duplicado.

create table if not exists pontos_extras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  pontos numeric(5, 2) not null check (pontos > 0 and pontos <= 100),
  bimestre integer not null check (bimestre in (1, 2)),
  criado_em timestamptz not null default now()
);

alter table pontos_extras enable row level security;

drop policy if exists "dono dos pontos extras" on pontos_extras;
create policy "dono dos pontos extras" on pontos_extras
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on pontos_extras to authenticated;

-- SEAU e ACI: 3 pontos no total, na média do 2º bimestre.
insert into pontos_extras (user_id, nome, pontos, bimestre)
select u.id, 'SEAU e ACI', 3, 2
from auth.users u
where not exists (select 1 from pontos_extras p where p.user_id = u.id and p.nome = 'SEAU e ACI');

-- A média para passar da faculdade é 5 em todas as matérias.
update disciplinas set media_minima = 5 where media_minima <> 5;
