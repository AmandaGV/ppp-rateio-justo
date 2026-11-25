import { useState } from 'react';
import Modal from '../comum/Modal';
import Alerta from '../comum/Alerta';
import { api } from '../../services/api';

export default function NovoGrupoModal({ aberto, aoFechar, aoCriar }) {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [erroNome, setErroNome] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  const fechar = () => {
    setNome('');
    setDescricao('');
    setErro('');
    setErroNome('');
    aoFechar();
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    if (!nome.trim()) {
      setErroNome('Informe o nome do grupo.');
      return;
    }
    setErroNome('');
    setEnviando(true);
    try {
      const grupo = await api.criarGrupo({ nome: nome.trim(), descricao: descricao.trim() });
      fechar();
      aoCriar(grupo);
    } catch (err) {
      setErro(err.message);
      if (err.errosPorCampo?.nome) setErroNome(err.errosPorCampo.nome);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal aberto={aberto} titulo="Novo grupo" aoFechar={fechar} testId="create-group-modal">
      <form onSubmit={enviar} noValidate data-testid="create-group-form">
        <Alerta tipo="erro" testId="create-group-error-alert">{erro}</Alerta>
        <div className="campo">
          <label htmlFor="grupo-nome">Nome do grupo</label>
          <input id="grupo-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100}
            className={erroNome ? 'invalido' : ''} data-testid="create-group-name-input" autoFocus />
          {erroNome && <span className="erro-campo" data-testid="create-group-name-error">{erroNome}</span>}
        </div>
        <div className="campo">
          <label htmlFor="grupo-descricao">Descrição (opcional)</label>
          <textarea id="grupo-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} maxLength={200}
            rows={3} data-testid="create-group-description-input" />
        </div>
        <p className="texto-suave texto-pequeno">Você será o ADMIN do grupo. Ele nasce com status ABERTO.</p>
        <div className="modal-acoes">
          <button type="button" className="botao botao-secundario" onClick={fechar} data-testid="create-group-cancel-button">Cancelar</button>
          <button type="submit" className="botao botao-primario" disabled={enviando} data-testid="create-group-submit-button">
            {enviando ? 'Criando...' : 'Criar grupo'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
