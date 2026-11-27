import { useState } from 'react';
import Alerta from '../comum/Alerta';
import ConfirmacaoModal from '../comum/ConfirmacaoModal';
import { api } from '../../services/api';
import { formatarMoeda } from '../../utils/formatadores';

const ROTULO_SITUACAO = { A_RECEBER: 'A receber', A_PAGAR: 'A pagar', QUITE: 'Quite' };

export default function BalancoTab({ grupo, balanco, aoAlterar }) {
  const [confirmarFechar, setConfirmarFechar] = useState(false);
  const [sucesso, setSucesso] = useState('');
  const souAdmin = grupo.meuPapel === 'ADMIN';

  if (!balanco) return null;

  return (
    <section data-testid="balance-section">
      <div className="cabecalho-secao">
        <h2>Balanço / Acerto de contas</h2>
        {souAdmin && grupo.status === 'ABERTO' && (
          <button type="button" className="botao botao-perigo" onClick={() => setConfirmarFechar(true)} data-testid="close-group-button">
            Fechar Grupo
          </button>
        )}
      </div>

      <Alerta tipo="sucesso" testId="balance-success-alert" aoFechar={() => setSucesso('')}>{sucesso}</Alerta>

      <div className="resumo" data-testid="balance-summary">
        <div className="cartao resumo-item">
          <span className="texto-suave">Total gasto</span>
          <strong data-testid="balance-total-spent">{formatarMoeda(balanco.totalGasto)}</strong>
        </div>
        <div className="cartao resumo-item">
          <span className="texto-suave">Pendente de acerto</span>
          <strong data-testid="balance-total-pending">{formatarMoeda(balanco.totalPendente)}</strong>
        </div>
        <div className="cartao resumo-item">
          <span className="texto-suave">Já quitado</span>
          <strong data-testid="balance-total-settled">{formatarMoeda(balanco.totalQuitado)}</strong>
        </div>
      </div>

      <h3>Saldos individuais</h3>
      <p className="texto-suave texto-pequeno">Considera apenas despesas pendentes. Saldo positivo = tem a receber; negativo = deve pagar.</p>
      <div className="tabela-container">
        <table className="tabela" data-testid="balance-members-table">
          <thead>
            <tr>
              <th>Participante</th>
              <th className="num">Pagou</th>
              <th className="num">Deveria pagar</th>
              <th className="num">Saldo</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            {balanco.membros.map((m) => {
              const t = `balance-row-${m.usuarioId}`;
              return (
                <tr key={m.usuarioId} data-testid={t} data-member-email={m.email}>
                  <td data-testid={`${t}-name`}>{m.nome}</td>
                  <td className="num" data-testid={`${t}-paid`}>{formatarMoeda(m.totalPago)}</td>
                  <td className="num" data-testid={`${t}-owed`}>{formatarMoeda(m.totalDevido)}</td>
                  <td className={`num saldo ${m.saldo > 0 ? 'positivo' : m.saldo < 0 ? 'negativo' : ''}`} data-testid={`${t}-balance`} data-value={m.saldo}>
                    {formatarMoeda(m.saldo)}
                  </td>
                  <td>
                    <span className={`badge badge-situacao-${m.situacao.toLowerCase()}`} data-testid={`${t}-status`} data-status={m.situacao}>
                      {ROTULO_SITUACAO[m.situacao]}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3>Quem paga quanto para quem</h3>
      {balanco.transferencias.length === 0 ? (
        <div className="vazio" data-testid="balance-no-transfers">Tudo certo! Ninguém deve nada a ninguém.</div>
      ) : (
        <ol className="lista-transferencias" data-testid="balance-transfers-list">
          {balanco.transferencias.map((tr, i) => (
            <li key={`${tr.deUsuarioId}-${tr.paraUsuarioId}`} className="transferencia" data-testid={`balance-transfer-${i}`}
              data-from={tr.deUsuarioId} data-to={tr.paraUsuarioId} data-value={tr.valor}>
              <strong data-testid={`balance-transfer-${i}-from`}>{tr.deNome}</strong>
              <span className="seta" aria-label="paga para">→</span>
              <strong data-testid={`balance-transfer-${i}-to`}>{tr.paraNome}</strong>
              <span className="valor-transferencia" data-testid={`balance-transfer-${i}-amount`}>{formatarMoeda(tr.valor)}</span>
            </li>
          ))}
        </ol>
      )}

      <ConfirmacaoModal
        aberto={confirmarFechar}
        titulo="Fechar grupo"
        mensagem="Após fechado, não será mais possível criar, editar ou excluir despesas neste grupo. Esta ação não pode ser desfeita. Deseja continuar?"
        textoConfirmar="Fechar Grupo"
        testId="close-group-modal"
        aoFechar={() => setConfirmarFechar(false)}
        aoConfirmar={async () => {
          await api.fecharGrupo(grupo.id);
          setConfirmarFechar(false);
          setSucesso('Grupo fechado com sucesso.');
          aoAlterar();
        }}
      />
    </section>
  );
}
