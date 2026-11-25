import { Link } from 'react-router-dom';

export default function NaoEncontradoPage() {
  return (
    <div className="pagina-auth" data-testid="not-found-page">
      <div className="cartao cartao-auth">
        <h1>Página não encontrada</h1>
        <p className="texto-suave">O endereço acessado não existe.</p>
        <Link to="/grupos" className="botao botao-primario" data-testid="not-found-home-link">Ir para meus grupos</Link>
      </div>
    </div>
  );
}
