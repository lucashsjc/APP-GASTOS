-- "Descontar no mês": o gasto conta em outro mês que não o da data (ex.: comprou no fim de outubro
-- com o Caju que vale para novembro). Vazio = conta no mês da data. Pode rodar mais de uma vez.

alter table gastos add column if not exists mes_conta text
  check (mes_conta is null or mes_conta ~ '^\d{4}-(0[1-9]|1[0-2])$');
