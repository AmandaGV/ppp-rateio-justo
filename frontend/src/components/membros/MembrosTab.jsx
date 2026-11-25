import { useState } from 'react';
import Alerta from '../comum/Alerta';
import ConfirmacaoModal from '../comum/ConfirmacaoModal';
import { PapelBadge } from '../comum/Badges';
import { api } from '../../services/api';
import { emailValido } from '../../utils/validacoes';

export default function MembrosTab({ grupo, usuario, aoAlterar }) {
  const [email, setEmail] = useState('');
  const [erroEmail, setErroEmail] = useState('');
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [paraRemover, setParaRemover] = useState(null);

  const souAdmin = grupo.meuPapel === 'ADMIN';
  const lotado = grupo.totalMembros >= grupo.limiteMembros;

  const adicionar = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    if (!email.trim()) return setErroEmail('Informe o e-mail.');
    if (!emailValido(email)) return setErroEmail('Formato de e-mail inválido.');
    setErroEmail('');
    setEnviando(true);
    try {
      const membro = await api.adicionarMembro(grupo.id, email.trim());
      setSucesso(`${membro.nome} foi adicionado(a) como MEMBRO.`);
      setEmail('');
      aoAlterar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
    return undefined;
  };

  return (
    <section data-testid="members-section">
      <div className="cabecalho-secao">
        <h2>Membros</h2>
        <span className={`contador ${lotado ? 'lotado' : ''}`} data-testid="members-count">
          {grupo.totalMembros}/{grupo.limiteMembros} participantes
        </span>
      </div>

      <Alerta tipo="sucesso" testId="members-success-alert" aoFechar={() => setSucesso('')}>{sucesso}</Alerta>
      <Alerta tipo="erro" testId="members-error-alert" aoFechar={() => setErro('')}>{erro}</Alerta>

      {souAdmin ? (
        <form className="form-inline" onSubmit={adicionar} noValidate data-testid="add-member-form">
          <div className="campo campo-flex">
            <label htmlFor="membro-email">Adicionar participante por e-mail</label>
            <input id="membro-email" type="email" placeholder="pessoa@exemplo.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className={erroEmail ? 'invalido' : ''} data-testid="add-member-email-input" />
            {erroEmail && <span className="erro-campo" data-testid="add-member-email-error">{erroEmail}</span>}
          </div>
          <button type="submit" className="botao botao-primario" disabled={enviando} data-testid="add-member-submit-button">
            {enviando ? 'Adicionando...' : 'Adicionar'}
          </button>
        </form>
      ) : (
        <p className="texto-suave" data-testid="members-admin-only-info">Somente o ADMIN pode adicionar ou remover participantes.</p>
      )}

      <ul className="lista-membros" data-testid="members-list">
        {grupo.membros.map((m) => (
          <li key={m.usuarioId} className="membro" data-testid={`member-row-${m.usuarioId}`} data-member-email={m.email}>
            <div className="avatar" aria-hidden="true">{m.nome.charAt(0).toUpperCase()}</div>
            <div className="membro-info">
              <strong data-testid={`member-name-${m.usuarioId}`}>{m.nome}{m.usuarioId === usuario.id ? ' (você)' : ''}</strong>
              <span className="texto-suave" data-testid={`member-email-${m.usuarioId}`}>{m.email}</span>
            </div>
            <PapelBadge papel={m.papel} testId={`member-role-badge-${m.usuarioId}`} />
            {souAdmin && m.papel === 'MEMBRO' && (
              <button type="button" className="botao botao-perigo-contorno botao-pequeno" onClick={() => setParaRemover(m)}
                data-testid={`member-remove-button-${m.usuarioId}`}>
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>

      <ConfirmacaoModal
        aberto={Boolean(paraRemover)}
        titulo="Remover participante"
        mensagem={`Remover ${paraRemover?.nome} do grupo?`}
        textoConfirmar="Remover"
        testId="remove-member-modal"
        aoFechar={() => setParaRemover(null)}
        aoConfirmar={async () => {
          await api.removerMembro(grupo.id, paraRemover.usuarioId);
          setSucesso(`${paraRemover.nome} foi removido(a) do grupo.`);
          setParaRemover(null);
          aoAlterar();
        }}
      />
    </section>
  );
}
