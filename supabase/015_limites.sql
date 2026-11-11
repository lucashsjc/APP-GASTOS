-- Limite do mês por categoria (ex.: Alimentação no Nubank até R$ 200): o app mostra a barra e avisa
-- quando estiver perto. Um limite por categoria em cada cartão.
-- Rodar no Supabase: SQL Editor → New query → colar → Run. Pode rodar mais de uma vez.

create table if not exists limites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  aba text not null check (aba in ('nubank', 'caju')),
  categoria text not null check (length(trim(categoria)) > 0),
  valor_centavos integer not null check (valor_centavos > 0),
  criado_em timestamptz not null default now(),
  unique (user_id, aba, categoria)
);

alter table limites enable row level security;

drop policy if exists "dono dos limites" on limites;
create policy "dono dos limites" on limites
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on limites to authenticated;
