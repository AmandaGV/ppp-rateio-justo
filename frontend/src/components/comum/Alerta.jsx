/**
 * Mensagem de alerta acessível.
 * tipo: 'erro' | 'sucesso' | 'aviso' | 'info'
 */
export default function Alerta({ tipo = 'erro', children, testId, aoFechar }) {
  if (!children) return null;
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'} data-testid={testId || `alert-${tipo}`}>
      <span className="alerta-texto" data-testid={`${testId || `alert-${tipo}`}-message`}>{children}</span>
      {aoFechar && (
        <button type="button" className="alerta-fechar" onClick={aoFechar} aria-label="Fechar alerta" data-testid={`${testId || `alert-${tipo}`}-close-button`}>
          ×
        </button>
      )}
    </div>
  );
}
