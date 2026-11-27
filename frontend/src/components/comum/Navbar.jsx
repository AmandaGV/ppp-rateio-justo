import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { usuario, sair } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="navbar" data-testid="navbar">
      <Link to="/grupos" className="navbar-logo" data-testid="navbar-logo-link">💸 RateioJusto</Link>
      {usuario && (
        <div className="navbar-usuario">
          <span data-testid="navbar-user-name">Olá, <strong>{usuario.nome}</strong></span>
          <button
            type="button"
            className="botao botao-secundario botao-pequeno"
            data-testid="navbar-logout-button"
            onClick={() => {
              sair();
              navigate('/login');
            }}
          >
            Sair
          </button>
        </div>
      )}
    </nav>
  );
}
