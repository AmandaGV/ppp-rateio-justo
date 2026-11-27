import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, definirAoNaoAutenticado, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(Boolean(tokenStorage.obter()));
  const [avisoSessao, setAvisoSessao] = useState('');

  const sair = useCallback((mensagem = '') => {
    tokenStorage.remover();
    setUsuario(null);
    setAvisoSessao(mensagem);
  }, []);

  useEffect(() => {
    definirAoNaoAutenticado((erro) => sair(erro.message || 'Sua sessão expirou. Faça login novamente.'));
  }, [sair]);

  useEffect(() => {
    if (!tokenStorage.obter()) return;
    api.eu()
      .then(setUsuario)
      .catch(() => tokenStorage.remover())
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (email, senha) => {
    const resposta = await api.login({ email, senha });
    tokenStorage.salvar(resposta.token);
    setAvisoSessao('');
    setUsuario(resposta.usuario);
    return resposta.usuario;
  }, []);

  const valor = useMemo(
    () => ({ usuario, carregando, entrar, sair, avisoSessao, limparAvisoSessao: () => setAvisoSessao('') }),
    [usuario, carregando, entrar, sair, avisoSessao]
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
