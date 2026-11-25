import { useEffect } from 'react';

export default function Modal({ titulo, aberto, aoFechar, children, testId = 'modal', largo = false }) {
  useEffect(() => {
    if (!aberto) return undefined;
    const tecla = (e) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return (
    <div className="modal-fundo" data-testid={`${testId}-overlay`} onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={`modal ${largo ? 'modal-largo' : ''}`} role="dialog" aria-modal="true" aria-labelledby={`${testId}-title`} data-testid={testId}>
        <header className="modal-cabecalho">
          <h2 id={`${testId}-title`} data-testid={`${testId}-title`}>{titulo}</h2>
          <button type="button" className="botao-icone" onClick={aoFechar} aria-label="Fechar" data-testid={`${testId}-close-button`}>×</button>
        </header>
        <div className="modal-corpo">{children}</div>
      </div>
    </div>
  );
}
