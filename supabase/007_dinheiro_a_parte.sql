-- Marca "Paguei com dinheiro à parte": o gasto fica na lista, mas fora das contas do card
-- (livre para gastar, barra e gasto no mês). Rodar depois do 006. Pode rodar mais de uma vez.

alter table gastos add column if not exists dinheiro_a_parte boolean not null default false;
alter table recorrencias add column if not exists dinheiro_a_parte boolean not null default false;

-- O PORTO é pago com outro dinheiro (não com o recebido): marca o "todo mês" e todos os meses.
update recorrencias set dinheiro_a_parte = true where upper(trim(descricao)) = 'PORTO' and not dinheiro_a_parte;
update gastos set dinheiro_a_parte = true where upper(trim(descricao)) = 'PORTO' and not dinheiro_a_parte;
