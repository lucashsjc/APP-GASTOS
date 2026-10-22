-- Permite cadastrar uma avaliação que ainda não aconteceu (ex.: P2 com peso 2, sem nota),
-- usada no "quanto preciso tirar". Rodar depois do 003_faculdade.sql. Pode rodar mais de uma vez.

alter table notas alter column valor drop not null;
