-- Conferência (opcional): mostra se o RLS está ligado e quais políticas existem em cada tabela.
-- Não altera nada. Rodar depois do schema.sql; todas as linhas devem mostrar rls_ligado = true
-- (as tabelas da Faculdade aparecem depois do 003_faculdade.sql).

select
  c.relname as tabela,
  c.relrowsecurity as rls_ligado,
  coalesce(string_agg(p.polname, ', '), '(nenhuma)') as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public'
  and c.relname in ('gastos', 'recorrencias', 'recebidos', 'depositos', 'disciplinas', 'notas', 'faltas', 'atividades')
group by c.relname, c.relrowsecurity
order by c.relname;
