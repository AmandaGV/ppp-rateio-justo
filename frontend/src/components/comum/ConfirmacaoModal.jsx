import { useState } from 'react';
import Modal from './Modal';
import Alerta from './Alerta';

/** Modal de confirmação para ações destrutivas/irreversíveis. */
export default function ConfirmacaoModal({ aberto, titulo, mensagem, textoConfirmar = 'Confirmar', perigo = true, aoConfirmar, aoFechar, testId = 'confirm-modal' }) {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const fechar = () => {
    setErro('');
    aoFechar();
  };

  const confirmar = async () => {
    setEnviando(true);
    setErro('');
    try {
      await aoConfirmar();
      setErro('');
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal aberto={aberto} titulo={titulo} aoFechar={fechar} testId={testId}>
      <p data-testid={`${testId}-message`}>{mensagem}</p>
      <Alerta tipo="erro" testId={`${testId}-error-alert`}>{erro}</Alerta>
      <div className="modal-acoes">
        <button type="button" className="botao botao-secundario" onClick={fechar} data-testid={`${testId}-cancel-button`}>Cancelar</button>
        <button type="button" className={`botao ${perigo ? 'botao-perigo' : 'botao-primario'}`} onClick={confirmar} disabled={enviando} data-testid={`${testId}-confirm-button`}>
          {enviando ? 'Processando...' : textoConfirmar}
        </button>
      </div>
    </Modal>
  );
}
