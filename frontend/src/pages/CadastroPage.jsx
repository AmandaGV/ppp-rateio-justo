import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Alerta from '../components/comum/Alerta';
import { REGRAS_SENHA, emailValido } from '../utils/validacoes';

export default function CadastroPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmacao: '' });
  const [errosCampo, setErrosCampo] = useState({});
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/grupos" replace />;

  const alterar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const validar = () => {
    const erros = {};
    if (!form.nome.trim()) erros.nome = 'Informe o nome.';
    if (!form.email.trim()) erros.email = 'Informe o e-mail.';
    else if (!emailValido(form.email)) erros.email = 'Formato de e-mail inválido.';
    const falhas = REGRAS_SENHA.filter((r) => !r.teste(form.senha));
    if (!form.senha) erros.senha = 'Informe a senha.';
    else if (falhas.length) erros.senha = `A senha precisa de: ${falhas.map((f) => f.texto.toLowerCase()).join(', ')}.`;
    if (form.confirmacao !== form.senha) erros.confirmacao = 'As senhas não conferem.';
    setErrosCampo(erros);
    return Object.keys(erros).length === 0;
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErro('');
    if (!validar()) return;
    setEnviando(true);
    try {
      await api.registrar({ nome: form.nome.trim(), email: form.email.trim(), senha: form.senha });
      navigate('/login', { state: { cadastroOk: true } });
    } catch (err) {
      setErro(err.message);
      setErrosCampo(err.errosPorCampo || {});
    } finally {
      setEnviando(false);
    }
  };

  const campo = (id, testKey, rotulo, tipo, autoComplete) => (
    <div className="campo">
      <label htmlFor={`register-${id}`}>{rotulo}</label>
      <input
        id={`register-${id}`} type={tipo} autoComplete={autoComplete} value={form[id]}
        onChange={alterar(id)} className={errosCampo[id] ? 'invalido' : ''} aria-invalid={Boolean(errosCampo[id])}
        data-testid={`register-${testKey}-input`}
      />
      {errosCampo[id] && <span className="erro-campo" data-testid={`register-${testKey}-error`}>{errosCampo[id]}</span>}
    </div>
  );

  return (
    <div className="pagina-auth">
      <form className="cartao cartao-auth" onSubmit={enviar} noValidate data-testid="register-form">
        <h1 className="titulo-auth">Criar conta</h1>
        <p className="subtitulo">Cadastre-se para criar e participar de grupos de rateio.</p>

        <Alerta tipo="erro" testId="register-error-alert">{erro}</Alerta>

        {campo('nome', 'name', 'Nome', 'text', 'name')}
        {campo('email', 'email', 'E-mail', 'email', 'email')}
        {campo('senha', 'password', 'Senha', 'password', 'new-password')}

        <ul className="regras-senha" data-testid="register-password-rules">
          {REGRAS_SENHA.map((r) => {
            const ok = r.teste(form.senha);
            return (
              <li key={r.id} className={ok ? 'ok' : ''} data-testid={`register-password-rule-${r.id}`} data-valid={ok}>
                {ok ? '✓' : '○'} {r.texto}
              </li>
            );
          })}
        </ul>

        {campo('confirmacao', 'password-confirm', 'Confirmar senha', 'password', 'new-password')}

        <button type="submit" className="botao botao-primario botao-bloco" disabled={enviando} data-testid="register-submit-button">
          {enviando ? 'Cadastrando...' : 'Cadastrar'}
        </button>

        <p className="rodape-auth">
          Já tem conta? <Link to="/login" data-testid="register-login-link">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
