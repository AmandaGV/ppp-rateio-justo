/**
 * Cliente HTTP da API RateioJusto.
 * Em desenvolvimento, o Vite faz proxy de /api para http://localhost:3001.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '';
const CHAVE_TOKEN = 'rateiojusto:token';

export class ApiError extends Error {
  constructor(status, corpo) {
    super(corpo?.mensagem || 'Erro inesperado ao comunicar com o servidor.');
    this.status = status;
    this.erro = corpo?.erro;
    this.detalhes = corpo?.detalhes;
  }

  /** Erros por campo (400) no formato { campo: mensagem }. */
  get errosPorCampo() {
    if (!Array.isArray(this.detalhes)) return {};
    return this.detalhes.reduce((acc, d) => {
      acc[d.campo] = acc[d.campo] ? `${acc[d.campo]} ${d.mensagem}` : d.mensagem;
      return acc;
    }, {});
  }
}

export const tokenStorage = {
  obter: () => localStorage.getItem(CHAVE_TOKEN),
  salvar: (token) => localStorage.setItem(CHAVE_TOKEN, token),
  remover: () => localStorage.removeItem(CHAVE_TOKEN),
};

let aoNaoAutenticado = () => {};
export function definirAoNaoAutenticado(fn) {
  aoNaoAutenticado = fn;
}

async function requisicao(metodo, caminho, corpo) {
  const headers = { 'Content-Type': 'application/json' };
  const token = tokenStorage.obter();
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta;
  try {
    resposta = await fetch(`${BASE_URL}/api${caminho}`, {
      method: metodo,
      headers,
      body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
    });
  } catch {
    throw new ApiError(0, { erro: 'SEM_CONEXAO', mensagem: 'Não foi possível conectar à API. Verifique se o backend está em execução.' });
  }

  if (resposta.status === 204) return null;
  const dados = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    const erro = new ApiError(resposta.status, dados);
    if (resposta.status === 401 && token) aoNaoAutenticado(erro);
    throw erro;
  }
  return dados;
}

export const api = {
  // autenticação
  registrar: (dados) => requisicao('POST', '/auth/register', dados),
  login: (dados) => requisicao('POST', '/auth/login', dados),
  eu: () => requisicao('GET', '/auth/me'),

  // grupos
  listarGrupos: () => requisicao('GET', '/grupos'),
  criarGrupo: (dados) => requisicao('POST', '/grupos', dados),
  obterGrupo: (id) => requisicao('GET', `/grupos/${id}`),
  excluirGrupo: (id) => requisicao('DELETE', `/grupos/${id}`),
  fecharGrupo: (id) => requisicao('PATCH', `/grupos/${id}/fechar`),

  // membros
  adicionarMembro: (id, email) => requisicao('POST', `/grupos/${id}/membros`, { email }),
  removerMembro: (id, usuarioId) => requisicao('DELETE', `/grupos/${id}/membros/${usuarioId}`),

  // despesas
  listarDespesas: (id) => requisicao('GET', `/grupos/${id}/despesas`),
  criarDespesa: (id, dados) => requisicao('POST', `/grupos/${id}/despesas`, dados),
  atualizarDespesa: (id, despesaId, dados) => requisicao('PUT', `/grupos/${id}/despesas/${despesaId}`, dados),
  excluirDespesa: (id, despesaId) => requisicao('DELETE', `/grupos/${id}/despesas/${despesaId}`),
  quitarDespesa: (id, despesaId) => requisicao('PATCH', `/grupos/${id}/despesas/${despesaId}/quitar`),

  // balanço
  balanco: (id) => requisicao('GET', `/grupos/${id}/balanco`),
};
