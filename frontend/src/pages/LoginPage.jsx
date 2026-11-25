import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Alerta from '../components/comum/Alerta';
import { emailValido } from '../utils/validacoes';

export default function LoginPage() {
  const { usuario, entrar, avisoSessao, limparAvisoSessao } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [errosCampo, setErrosCampo] = useState({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const cadastroOk = location.state?.cadastroOk;

  if (usuario) return <Navigate to="/grupos" replace />;

  const validar = () => {
    const erros = {};
    if (!email.trim()) erros.email = 'Informe o e-mail.';
    else if (!emailValido(email)) erros.email = 'Formato de e-mail inválido.';
    if (!senha) erros.senha = 'Informe a senha.';
    setErrosCampo(erros);
    return Object.keys(erros).length === 0;
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    limparAvisoSessao();
    if (!validar()) return;
    setEnviando(true);
    try {
      await entrar(email.trim(), senha);
      navigate(location.state?.de || '/grupos', { replace: true });
    } catch (err) {
      setErro(err.message);
      setErrosCampo(err.errosPorCampo || {});
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="pagina-auth">
      <form className="cartao cartao-auth" onSubmit={enviar} noValidate data-testid="login-form">
        <h1 className="titulo-auth">💸 RateioJusto</h1>
        <p className="subtitulo">Entre para dividir despesas de forma justa.</p>

        {cadastroOk && <Alerta tipo="sucesso" testId="login-success-alert">Cadastro realizado com sucesso! Faça login para continuar.</Alerta>}
        <Alerta tipo="aviso" testId="login-session-alert">{avisoSessao}</Alerta>
        <Alerta tipo="erro" testId="login-error-alert">{erro}</Alerta>

        <div className="campo">
          <label htmlFor="login-email">E-mail</label>
          <input
            id="login-email" type="email" autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={errosCampo.email ? 'invalido' : ''}
            aria-invalid={Boolean(errosCampo.email)}
            data-testid="login-email-input"
          />
          {errosCampo.email && <span className="erro-campo" data-testid="login-email-error">{errosCampo.email}</span>}
        </div>

        <div className="campo">
          <label htmlFor="login-senha">Senha</label>
          <input
            id="login-senha" type="password" autoComplete="current-password" value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={errosCampo.senha ? 'invalido' : ''}
            aria-invalid={Boolean(errosCampo.senha)}
            data-testid="login-password-input"
          />
          {errosCampo.senha && <span className="erro-campo" data-testid="login-password-error">{errosCampo.senha}</span>}
        </div>

        <button type="submit" className="botao botao-primario botao-bloco" disabled={enviando} data-testid="login-submit-button">
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="rodape-auth">
          Ainda não tem conta? <Link to="/cadastro" data-testid="login-register-link">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
