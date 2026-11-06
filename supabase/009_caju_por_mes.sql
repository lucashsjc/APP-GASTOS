-- Caju por mês: o depósito pode valer para outro mês que não o da data (o Caju cai no fim de um
-- mês valendo para o seguinte). Vazio = vale para o mês da data. Rodar depois do 008.
-- Pode rodar mais de uma vez.

alter table depositos add column if not exists mes_conta text
  check (mes_conta is null or mes_conta ~ '^\d{4}-(0[1-9]|1[0-2])$');

-- Os depósitos que já estão no app e caíram do dia 20 em diante passam a valer para o mês seguinte.
update depositos
set mes_conta = to_char(data + interval '1 month', 'YYYY-MM')
where mes_conta is null and extract(day from data) >= 20;
