import { useEffect, useMemo, useState } from 'react';
import Modal from '../comum/Modal';
import Alerta from '../comum/Alerta';
import { api } from '../../services/api';
import { formatarMoeda, lerNumero, paraCentavos } from '../../utils/formatadores';

const TIPOS = [
  { valor: 'IGUALITARIO', rotulo: 'Igualitário', ajuda: 'Divide o valor líquido igualmente entre os participantes selecionados.' },
  { valor: 'PERCENTUAL', rotulo: 'Percentual', ajuda: 'Informe o percentual de cada participante. A soma deve ser exatamente 100%.' },
  { valor: 'VALOR_EXATO', rotulo: 'Valor exato', ajuda: 'Informe o valor de cada participante. A soma deve ser igual ao valor líquido.' },
];

const hoje = () => new Date().toISOString().slice(0, 10);
const numeroParaTexto = (n) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

function estadoInicial(despesa, membros, usuarioId) {
  if (!despesa) {
    return {
      descricao: '',
      valorTotal: '',
      desconto: '',
      data: hoje(),
      pagoPorId: usuarioId,
      tipoRateio: 'IGUALITARIO',
      participantes: membros.map((m) => m.usuarioId),
      percentuais: {},
      valores: {},
    };
  }
  const porId = (campo) => Object.fromEntries(despesa.divisoes.map((d) => [d.usuarioId, numeroParaTexto(d[campo])]));
  return {
    descricao: despesa.descricao,
    valorTotal: numeroParaTexto(despesa.valorTotal),
    desconto: despesa.descontoPercentual ? numeroParaTexto(despesa.descontoPercentual) : '',
    data: despesa.data ? despesa.data.slice(0, 10) : hoje(),
    pagoPorId: despesa.pagoPor.id,
    tipoRateio: despesa.tipoRateio,
    participantes: despesa.tipoRateio === 'IGUALITARIO' ? despesa.divisoes.map((d) => d.usuarioId) : membros.map((m) => m.usuarioId),
    percentuais: despesa.tipoRateio === 'PERCENTUAL' ? porId('percentual') : {},
    valores: despesa.tipoRateio === 'VALOR_EXATO' ? porId('valor') : {},
  };
}

/**
 * Formulário dinâmico de despesa: os campos de divisão mudam conforme o tipoRateio.
 * Validações de negócio (limites, somas, permissões) são feitas pela API e exibidas no alerta.
 */
export default function DespesaFormModal({ aberto, grupo, despesa, usuario, aoFechar, aoSalvar }) {
  const membros = grupo.membros;
  const [form, setForm] = useState(() => estadoInicial(despesa, membros, usuario.id));
  const [errosCampo, setErrosCampo] = useState({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const editando = Boolean(despesa);

  useEffect(() => {
    if (aberto) {
      setForm(estadoInicial(despesa, membros, usuario.id));
      setErro('');
      setErrosCampo({});
    }
  }, [aberto, despesa, membros, usuario.id]);

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  // ---- cálculos de apoio (somente exibição) ----
  const valorTotal = lerNumero(form.valorTotal);
  const desconto = form.desconto === '' ? 0 : lerNumero(form.desconto);
  const liquidoCentavos = Number.isFinite(valorTotal) && Number.isFinite(desconto)
    ? paraCentavos(valorTotal) - Math.round((paraCentavos(valorTotal) * Math.round(desconto * 100)) / 10000)
    : NaN;

  const somaPercentuais = useMemo(
    () => Object.values(form.percentuais).reduce((s, v) => s + (Number.isFinite(lerNumero(v)) ? Math.round(lerNumero(v) * 100) : 0), 0) / 100,
    [form.percentuais]
  );
  const somaValoresCentavos = useMemo(
    () => Object.values(form.valores).reduce((s, v) => s + (Number.isFinite(lerNumero(v)) ? paraCentavos(lerNumero(v)) : 0), 0),
    [form.valores]
  );
  const porPessoaIgualitario = Number.isFinite(liquidoCentavos) && form.participantes.length > 0
    ? liquidoCentavos / 100 / form.participantes.length
    : null;

  const alternarParticipante = (id) => {
    set('participantes', form.participantes.includes(id) ? form.participantes.filter((p) => p !== id) : [...form.participantes, id]);
  };

  const montarPayload = () => {
    const erros = {};
    if (!form.descricao.trim()) erros.descricao = 'Informe a descrição.';
    if (form.valorTotal === '') erros.valorTotal = 'Informe o valor total.';
    else if (!Number.isFinite(valorTotal)) erros.valorTotal = 'Valor inválido. Use números, ex.: 150,50.';
    if (form.desconto !== '' && !Number.isFinite(desconto)) erros.descontoPercentual = 'Desconto inválido. Use números, ex.: 10.';

    const payload = {
      descricao: form.descricao.trim(),
      valorTotal,
      descontoPercentual: form.desconto === '' ? 0 : desconto,
      tipoRateio: form.tipoRateio,
      pagoPorId: form.pagoPorId,
      data: form.data || undefined,
    };

    if (form.tipoRateio === 'IGUALITARIO') {
      // mantém a ordem dos membros para um rateio de centavos previsível
      payload.participantes = membros.map((m) => m.usuarioId).filter((id) => form.participantes.includes(id));
    } else {
      const fonte = form.tipoRateio === 'PERCENTUAL' ? form.percentuais : form.valores;
      const chave = form.tipoRateio === 'PERCENTUAL' ? 'percentual' : 'valor';
      payload.divisoes = membros
        .filter((m) => fonte[m.usuarioId] !== undefined && String(fonte[m.usuarioId]).trim() !== '')
        .map((m) => {
          const n = lerNumero(fonte[m.usuarioId]);
          if (!Number.isFinite(n)) erros.divisoes = 'Há valores de divisão inválidos.';
          return { usuarioId: m.usuarioId, [chave]: n };
        });
      if (payload.divisoes.length === 0) erros.divisoes = 'Informe a divisão de pelo menos 1 participante.';
    }

    setErrosCampo(erros);
    return Object.keys(erros).length === 0 ? payload : null;
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    const payload = montarPayload();
    if (!payload) return;
    setEnviando(true);
    try {
      const salva = editando
        ? await api.atualizarDespesa(grupo.id, despesa.id, payload)
        : await api.criarDespesa(grupo.id, payload);
      aoSalvar(salva, editando);
    } catch (err) {
      setErro(err.message);
      const porCampo = err.errosPorCampo || {};
      setErrosCampo(porCampo);
    } finally {
      setEnviando(false);
    }
  };

  const tipoAtual = TIPOS.find((t) => t.valor === form.tipoRateio);
  const percentualOk = somaPercentuais === 100;
  const valoresOk = somaValoresCentavos === liquidoCentavos;

  return (
    <Modal aberto={aberto} titulo={editando ? 'Editar despesa' : 'Nova despesa'} aoFechar={aoFechar} testId="expense-modal" largo>
      <form onSubmit={enviar} noValidate data-testid="expense-form" data-mode={editando ? 'edit' : 'create'}>
        <Alerta tipo="erro" testId="expense-form-error-alert">{erro}</Alerta>

        <div className="grade-2">
          <div className="campo">
            <label htmlFor="despesa-descricao">Descrição</label>
            <input id="despesa-descricao" value={form.descricao} onChange={(e) => set('descricao', e.target.value)} maxLength={200}
              className={errosCampo.descricao ? 'invalido' : ''} data-testid="expense-description-input" />
            {errosCampo.descricao && <span className="erro-campo" data-testid="expense-description-error">{errosCampo.descricao}</span>}
          </div>
          <div className="campo">
            <label htmlFor="despesa-data">Data</label>
            <input id="despesa-data" type="date" value={form.data} onChange={(e) => set('data', e.target.value)} data-testid="expense-date-input" />
          </div>
          <div className="campo">
            <label htmlFor="despesa-valor">Valor total (R$)</label>
            <input id="despesa-valor" inputMode="decimal" placeholder="0,00" value={form.valorTotal} onChange={(e) => set('valorTotal', e.target.value)}
              className={errosCampo.valorTotal ? 'invalido' : ''} data-testid="expense-amount-input" />
            <span className="ajuda">Entre R$ 0,01 e R$ 50.000,00</span>
            {errosCampo.valorTotal && <span className="erro-campo" data-testid="expense-amount-error">{errosCampo.valorTotal}</span>}
          </div>
          <div className="campo">
            <label htmlFor="despesa-desconto">Desconto (%)</label>
            <input id="despesa-desconto" inputMode="decimal" placeholder="0" value={form.desconto} onChange={(e) => set('desconto', e.target.value)}
              className={errosCampo.descontoPercentual ? 'invalido' : ''} data-testid="expense-discount-input" />
            <span className="ajuda">0% a 50%. Acima de 50% somente o ADMIN.</span>
            {errosCampo.descontoPercentual && <span className="erro-campo" data-testid="expense-discount-error">{errosCampo.descontoPercentual}</span>}
          </div>
          <div className="campo">
            <label htmlFor="despesa-pagador">Quem pagou</label>
            <select id="despesa-pagador" value={form.pagoPorId} onChange={(e) => set('pagoPorId', e.target.value)} data-testid="expense-payer-select">
              {membros.map((m) => <option key={m.usuarioId} value={m.usuarioId}>{m.nome}</option>)}
            </select>
          </div>
          <div className="campo">
            <span className="rotulo">Valor líquido</span>
            <strong className="valor-liquido" data-testid="expense-net-amount">
              {Number.isFinite(liquidoCentavos) ? formatarMoeda(liquidoCentavos / 100) : '—'}
            </strong>
          </div>
        </div>

        <fieldset className="campo">
          <legend>Tipo de rateio</legend>
          <div className="segmentado" role="radiogroup" data-testid="expense-split-type-group">
            {TIPOS.map((t) => (
              <label key={t.valor} className={`segmento ${form.tipoRateio === t.valor ? 'ativo' : ''}`}>
                <input type="radio" name="tipoRateio" value={t.valor} checked={form.tipoRateio === t.valor}
                  onChange={() => set('tipoRateio', t.valor)} data-testid={`expense-split-type-${t.valor.toLowerCase()}-radio`} />
                {t.rotulo}
              </label>
            ))}
          </div>
          <span className="ajuda" data-testid="expense-split-help">{tipoAtual.ajuda}</span>
        </fieldset>

        <div className="divisoes" data-testid={`expense-split-section-${form.tipoRateio.toLowerCase()}`}>
          {form.tipoRateio === 'IGUALITARIO' && membros.map((m) => (
            <label key={m.usuarioId} className="linha-divisao" data-testid={`expense-participant-row-${m.usuarioId}`}>
              <input type="checkbox" checked={form.participantes.includes(m.usuarioId)} onChange={() => alternarParticipante(m.usuarioId)}
                data-testid={`expense-participant-checkbox-${m.usuarioId}`} />
              <span>{m.nome}</span>
              <span className="texto-suave" data-testid={`expense-participant-share-${m.usuarioId}`}>
                {form.participantes.includes(m.usuarioId) && porPessoaIgualitario !== null ? `≈ ${formatarMoeda(porPessoaIgualitario)}` : ''}
              </span>
            </label>
          ))}

          {form.tipoRateio === 'PERCENTUAL' && membros.map((m) => (
            <div key={m.usuarioId} className="linha-divisao" data-testid={`expense-percentage-row-${m.usuarioId}`}>
              <label htmlFor={`pct-${m.usuarioId}`}>{m.nome}</label>
              <div className="entrada-sufixo">
                <input id={`pct-${m.usuarioId}`} inputMode="decimal" placeholder="0" value={form.percentuais[m.usuarioId] ?? ''}
                  onChange={(e) => set('percentuais', { ...form.percentuais, [m.usuarioId]: e.target.value })}
                  data-testid={`expense-percentage-input-${m.usuarioId}`} />
                <span>%</span>
              </div>
            </div>
          ))}

          {form.tipoRateio === 'VALOR_EXATO' && membros.map((m) => (
            <div key={m.usuarioId} className="linha-divisao" data-testid={`expense-exact-row-${m.usuarioId}`}>
              <label htmlFor={`val-${m.usuarioId}`}>{m.nome}</label>
              <div className="entrada-sufixo">
                <span>R$</span>
                <input id={`val-${m.usuarioId}`} inputMode="decimal" placeholder="0,00" value={form.valores[m.usuarioId] ?? ''}
                  onChange={(e) => set('valores', { ...form.valores, [m.usuarioId]: e.target.value })}
                  data-testid={`expense-exact-input-${m.usuarioId}`} />
              </div>
            </div>
          ))}

          {form.tipoRateio === 'PERCENTUAL' && (
            <p className={`soma ${percentualOk ? 'ok' : 'pendente'}`} data-testid="expense-percentage-total" data-valid={percentualOk}>
              Soma: {somaPercentuais.toLocaleString('pt-BR')}% de 100%
            </p>
          )}
          {form.tipoRateio === 'VALOR_EXATO' && (
            <p className={`soma ${valoresOk ? 'ok' : 'pendente'}`} data-testid="expense-exact-total" data-valid={valoresOk}>
              Soma: {formatarMoeda(somaValoresCentavos / 100)} de {Number.isFinite(liquidoCentavos) ? formatarMoeda(liquidoCentavos / 100) : '—'}
            </p>
          )}
          {errosCampo.divisoes && <span className="erro-campo" data-testid="expense-split-error">{errosCampo.divisoes}</span>}
        </div>

        <div className="modal-acoes">
          <button type="button" className="botao botao-secundario" onClick={aoFechar} data-testid="expense-cancel-button">Cancelar</button>
          <button type="submit" className="botao botao-primario" disabled={enviando} data-testid="expense-submit-button">
            {enviando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Lançar despesa'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
