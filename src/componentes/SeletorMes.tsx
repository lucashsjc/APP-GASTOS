import { useEstado } from '../estado'
import { somarMeses, tituloDoMes, mesDe } from '../lib/datas'
import { IconeAnterior, IconeProximo } from './icones'

export function SeletorMes() {
  const { mes, setMes, hoje } = useEstado()
  const mesAtual = mesDe(hoje)
  return (
    <div className="seletor-mes">
      <button type="button" aria-label="Mês anterior" onClick={() => setMes(somarMeses(mes, -1))}>
        <IconeAnterior />
      </button>
      <button
        type="button"
        className="seletor-mes-nome"
        onClick={() => setMes(mesAtual)}
        title={mes === mesAtual ? undefined : 'Voltar para o mês atual'}
      >
        {tituloDoMes(mes, mesAtual)}
        {mes !== mesAtual && <span className="ponto-mes" aria-hidden="true" />}
      </button>
      <button type="button" aria-label="Próximo mês" onClick={() => setMes(somarMeses(mes, 1))}>
        <IconeProximo />
      </button>
    </div>
  )
}
