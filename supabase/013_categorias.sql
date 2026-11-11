-- Arruma a categoria dos gastos que estão em "Outros", pelo nome (as mesmas regras do app).
-- Só mexe no que está em "Outros": o que você já categorizou fica como está. Pode rodar mais de uma vez.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      (1, 'Transporte', '\y(uber|99|gasolina|posto|combustivel|estacionamento|pedagio|onibus|metro)\y'),
      (2, 'Fixos', '\y(porto|spotify|icloud|netflix|youtube|amazon prime|academia)\y'),
      (3, 'Saúde', '\y(remedio|farmacia|drogaria|consulta|dentista)'),
      (4, 'Mercado', '\y(mercado|supermercado|atacadao|assai|emporio|hortifruti|padaria)\y'),
      (5, 'Alimentação', '\y(lanche|ifood|acai|agua|coca|refri|refrigerante|mango|cafe|pizza|hamburguer|burger|restaurante|cantina|almoco|janta|jantar|sorvete|salgado|pastel|suco|cerveja|mc ?donalds|bk|subway)\y'),
      (6, 'Lazer', '\y(gta|jogo|game|steam|playstation|psn|xbox|cinema|show|ingresso|bar|balada)\y'),
      (7, 'Compras', '\y(americanas|shopee|mercado livre|amazon|magalu|tampa|ps5|roupa|tenis|camiseta|loja)\y'),
      (8, 'Presentes', '\y(presente|aniversario)\y')
    ) as t(ordem, categoria, padrao) order by ordem
  loop
    update gastos set categoria = r.categoria
      where categoria = 'Outros'
        and translate(lower(descricao), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') ~ r.padrao;
    update recorrencias set categoria = r.categoria
      where categoria = 'Outros'
        and translate(lower(descricao), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') ~ r.padrao;
  end loop;
end $$;

-- Confira: quanto ficou em cada categoria.
select categoria, count(*) as gastos from gastos group by categoria order by gastos desc;
