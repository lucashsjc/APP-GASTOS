-- Horário da compra (HH:MM), preenchido no app ou pelo atalho do iPhone. Vazio = sem horário.
-- Rodar no Supabase: SQL Editor → New query → colar → Run. Pode rodar mais de uma vez.

alter table gastos add column if not exists hora text
  check (hora is null or hora ~ '^([01]\d|2[0-3]):[0-5]\d$');
