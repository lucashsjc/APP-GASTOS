-- Carteiras do Caju: o dinheiro vem separado em refeição e mobilidade, e cada gasto desconta de uma.
-- Vazio = pela categoria (Transporte → mobilidade, o resto → refeição; depósito vazio → refeição).
-- Rodar no Supabase: SQL Editor → New query → colar → Run. Pode rodar mais de uma vez.

alter table gastos add column if not exists carteira text
  check (carteira is null or carteira in ('refeicao', 'mobilidade'));

alter table depositos add column if not exists carteira text
  check (carteira is null or carteira in ('refeicao', 'mobilidade'));
