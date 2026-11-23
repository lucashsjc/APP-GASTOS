-- Projetos da UNIVAP: nome, matéria, grupo, situação (a fazer, em andamento, entregue) e a data de entrega.
-- Rodar no Supabase: SQL Editor → New query → colar → Run. Pode rodar mais de uma vez.

create table if not exists projetos_univap (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  materia text not null default '',
  grupo text not null default '',
  status text not null default 'a_fazer' check (status in ('a_fazer', 'andamento', 'entregue')),
  entrega date,
  observacao text not null default '',
  criado_em timestamptz not null default now()
);

alter table projetos_univap enable row level security;

drop policy if exists "dono dos projetos" on projetos_univap;
create policy "dono dos projetos" on projetos_univap
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on projetos_univap to authenticated;
