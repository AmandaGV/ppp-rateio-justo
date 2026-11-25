import { useState } from 'react';
import Alerta from '../comum/Alerta';
import ConfirmacaoModal from '../comum/ConfirmacaoModal';
import DespesaFormModal from './DespesaFormModal';
import { api } from '../../services/api';
import { formatarData, formatarMoeda } from '../../utils/formatadores';

const ROTULO_TIPO = { IGUALITARIO: 'Igualitário', PERCENTUAL: 'Percentual', VALOR_EXATO: 'Valor exato' };

export default function DespesasTab({ grupo, despesas, usuario, aoAlterar }) {
  const [formAberto, setFormAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState(null);
  const [paraExcluir, setParaExcluir] = useState(null);
  const [paraQuitar, setParaQuitar] = useState(null);
  const [sucesso, setSucesso] = useState('');
  const [expandida, setExpandida] = useState(null);

  const aberto = grupo.status === 'ABERTO';
  const souAdmin = grupo.meuPapel === 'ADMIN';
  const podeAlterar = (d) => aberto && !d.quitada && (souAdmin || d.autor.id === usuario.id);
  const podeQuitar = (d) => !d.quitada && (souAdmin || d.autor.id === usuario.id);

  const abrirNova = () => {
    setEmEdicao(null);
    setFormAberto(true);
  };

  return (
    <section data-testid="expenses-section">
      <div className="cabecalho-secao">
        <h2>Despesas</h2>
        {aberto && (
          <button type="button" className="botao botao-primario" onClick={abrirNova} data-testid="expense-create-button">
            + Nova despesa
          </button>
        )}
      </div>

      {!aberto && (
        <Alerta tipo="aviso" testId="expenses-group-closed-alert">
          Este grupo está FECHADO: não é possível criar, editar ou excluir despesas.
        </Alerta>
      )}
      <Alerta tipo="sucesso" testId="expenses-success-alert" aoFechar={() => setSucesso('')}>{sucesso}</Alerta>

      {despesas.length === 0 ? (
        <div className="vazio" data-testid="expenses-empty-state">Nenhuma despesa lançada ainda.</div>
      ) : (
        <div className="tabela-container">
          <table className="tabela" data-testid="expenses-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Descrição</th>
                <th>Pago por</th>
                <th>Rateio</th>
                <th className="num">Total</th>
                <th className="num">Desconto</th>
                <th className="num">Líquido</th>
                <th>Situação</th>
                <th aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {despesas.map((d) => {
                const t = `expense-row-${d.id}`;
                return [
                  <tr key={d.id} data-testid={t} data-expense-description={d.descricao}>
                    <td data-testid={`${t}-date`}>{formatarData(d.data)}</td>
                    <td>
                      <button type="button" className="link" onClick={() => setExpandida(expandida === d.id ? null : d.id)}
                        aria-expanded={expandida === d.id} data-testid={`${t}-toggle-details-button`}>
                        {d.descricao}
                      </button>
                      <div className="texto-suave texto-pequeno">por {d.autor.nome}</div>
                    </td>
                    <td data-testid={`${t}-payer`}>{d.pagoPor.nome}</td>
                    <td data-testid={`${t}-split-type`} data-split-type={d.tipoRateio}>{ROTULO_TIPO[d.tipoRateio]}</td>
                    <td className="num" data-testid={`${t}-total`}>{formatarMoeda(d.valorTotal)}</td>
                    <td className="num" data-testid={`${t}-discount`}>{d.descontoPercentual}%</td>
                    <td className="num" data-testid={`${t}-net`}><strong>{formatarMoeda(d.valorLiquido)}</strong></td>
                    <td>
                      <span className={`badge ${d.quitada ? 'badge-quitada' : 'badge-pendente'}`} data-testid={`${t}-settled-badge`} data-settled={d.quitada}>
                        {d.quitada ? 'QUITADA' : 'PENDENTE'}
                      </span>
                    </td>
                    <td className="acoes">
                      {podeAlterar(d) && (
                        <>
                          <button type="button" className="botao botao-secundario botao-pequeno" data-testid={`${t}-edit-button`}
                            onClick={() => { setEmEdicao(d); setFormAberto(true); }}>Editar</button>
                          <button type="button" className="botao botao-perigo-contorno botao-pequeno" data-testid={`${t}-delete-button`}
                            onClick={() => setParaExcluir(d)}>Excluir</button>
                        </>
                      )}
                      {podeQuitar(d) && (
                        <button type="button" className="botao botao-sucesso-contorno botao-pequeno" data-testid={`${t}-settle-button`}
                          onClick={() => setParaQuitar(d)}>Quitar</button>
                      )}
                    </td>
                  </tr>,
                  expandida === d.id && (
                    <tr key={`${d.id}-det`} className="linha-detalhe" data-testid={`${t}-details`}>
                      <td colSpan={9}>
                        <strong>Divisão:</strong>
                        <ul className="lista-divisao">
                          {d.divisoes.map((div) => (
                            <li key={div.usuarioId} data-testid={`${t}-share-${div.usuarioId}`}>
                              {div.nome}: {formatarMoeda(div.valor)}{div.percentual !== null ? ` (${div.percentual}%)` : ''}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      <DespesaFormModal
        aberto={formAberto}
        grupo={grupo}
        despesa={emEdicao}
        usuario={usuario}
        aoFechar={() => setFormAberto(false)}
        aoSalvar={(despesa, editando) => {
          setFormAberto(false);
          setSucesso(editando ? `Despesa "${despesa.descricao}" atualizada.` : `Despesa "${despesa.descricao}" lançada.`);
          aoAlterar();
        }}
      />

      <ConfirmacaoModal
        aberto={Boolean(paraExcluir)}
        titulo="Excluir despesa"
        mensagem={`Deseja excluir a despesa "${paraExcluir?.descricao}"? Esta ação não pode ser desfeita.`}
        textoConfirmar="Excluir"
        testId="delete-expense-modal"
        aoFechar={() => setParaExcluir(null)}
        aoConfirmar={async () => {
          await api.excluirDespesa(grupo.id, paraExcluir.id);
          setSucesso(`Despesa "${paraExcluir.descricao}" excluída.`);
          setParaExcluir(null);
          aoAlterar();
        }}
      />

      <ConfirmacaoModal
        aberto={Boolean(paraQuitar)}
        titulo="Quitar despesa"
        mensagem={`Marcar "${paraQuitar?.descricao}" como QUITADA? Ela deixará de compor os saldos e não poderá mais ser editada ou excluída.`}
        textoConfirmar="Quitar"
        perigo={false}
        testId="settle-expense-modal"
        aoFechar={() => setParaQuitar(null)}
        aoConfirmar={async () => {
          await api.quitarDespesa(grupo.id, paraQuitar.id);
          setSucesso(`Despesa "${paraQuitar.descricao}" marcada como QUITADA.`);
          setParaQuitar(null);
          aoAlterar();
        }}
      />
    </section>
  );
}
