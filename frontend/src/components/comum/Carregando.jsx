export default function Carregando({ texto = 'Carregando...', testId = 'loading-indicator' }) {
  return (
    <div className="carregando" data-testid={testId} role="status">
      <span className="spinner" aria-hidden="true" /> {texto}
    </div>
  );
}
