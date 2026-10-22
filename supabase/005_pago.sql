-- Marca de PAGO / NÃO PAGO em cada gasto. Rodar depois do schema.sql. Pode rodar mais de uma vez.

alter table gastos add column if not exists pago boolean not null default false;
