-- Observação em cada gasto (ex.: com qual dinheiro foi pago) e a marca "à parte" (o gasto aparece
-- separado e não soma com os outros do mês). Rodar depois do 005_pago.sql. Pode rodar mais de uma vez.

alter table gastos add column if not exists observacao text not null default '';
alter table gastos add column if not exists separado boolean not null default false;
alter table recorrencias add column if not exists observacao text not null default '';
alter table recorrencias add column if not exists separado boolean not null default false;

-- O PORTO fica à parte todo mês (o "todo mês" e os meses antigos importados da planilha).
update recorrencias set separado = true where upper(trim(descricao)) = 'PORTO' and not separado;
update gastos set separado = true where upper(trim(descricao)) = 'PORTO' and not separado;
