'use strict';

/**
 * Especificação OpenAPI 3.0 (configuração inline) servida em /api-docs
 * e disponível em JSON em /api-docs.json.
 */

const config = require('../config');

const ID_ANA = '650000000000000000000001';
const ID_BRUNO = '650000000000000000000002';
const ID_CARLA = '650000000000000000000003';
const ID_GRUPO = '660000000000000000000001';
const ID_DESPESA = '670000000000000000000001';

// ---------- helpers ----------
const ref = (nome) => ({ $ref: `#/components/schemas/${nome}` });
const erro = (descricao, exemplos) => ({
  description: descricao,
  content: {
    'application/json': {
      schema: ref('Erro'),
      examples: Object.fromEntries(Object.entries(exemplos).map(([k, v]) => [k, { value: v }])),
    },
  },
});
const ok = (descricao, schema, exemplo) => ({
  description: descricao,
  content: { 'application/json': { schema, ...(exemplo ? { example: exemplo } : {}) } },
});
const corpo = (schema, exemplos) => ({
  required: true,
  content: {
    'application/json': {
      schema,
      ...(exemplos ? { examples: Object.fromEntries(Object.entries(exemplos).map(([k, v]) => [k, { summary: v.summary, value: v.value }])) } : {}),
    },
  },
});

const E401 = erro('Token ausente, malformado, inválido ou expirado.', {
  ausente: { erro: 'NAO_AUTENTICADO', mensagem: 'Token de autenticação ausente. Envie o header Authorization: Bearer <token>.' },
  invalido: { erro: 'NAO_AUTENTICADO', mensagem: 'Token inválido.' },
  expirado: { erro: 'NAO_AUTENTICADO', mensagem: 'Token expirado. Faça login novamente.' },
});
const E403_NAO_MEMBRO = { erro: 'ACESSO_NEGADO', mensagem: 'Você não é participante deste grupo.' };
const E404_GRUPO = erro('Grupo não encontrado (inclui id em formato inválido).', {
  grupo: { erro: 'NAO_ENCONTRADO', mensagem: 'Grupo não encontrado.' },
});
const E404_DESPESA = erro('Grupo ou despesa não encontrados.', {
  grupo: { erro: 'NAO_ENCONTRADO', mensagem: 'Grupo não encontrado.' },
  despesa: { erro: 'NAO_ENCONTRADO', mensagem: 'Despesa não encontrada neste grupo.' },
});
const paramGrupo = { name: 'id', in: 'path', required: true, description: 'ID do grupo (ObjectId)', schema: { type: 'string', example: ID_GRUPO } };
const paramDespesa = { name: 'despesaId', in: 'path', required: true, description: 'ID da despesa (ObjectId)', schema: { type: 'string', example: ID_DESPESA } };

const exemploDespesa = {
  id: ID_DESPESA,
  grupoId: ID_GRUPO,
  descricao: 'Hospedagem',
  valorTotal: 1200,
  descontoPercentual: 0,
  valorDesconto: 0,
  valorLiquido: 1200,
  tipoRateio: 'IGUALITARIO',
  autor: { id: ID_ANA, nome: 'Ana Souza', email: 'ana@rateiojusto.com' },
  pagoPor: { id: ID_ANA, nome: 'Ana Souza', email: 'ana@rateiojusto.com' },
  divisoes: [
    { usuarioId: ID_ANA, nome: 'Ana Souza', percentual: null, valor: 400 },
    { usuarioId: ID_BRUNO, nome: 'Bruno Lima', percentual: null, valor: 400 },
    { usuarioId: ID_CARLA, nome: 'Carla Mendes', percentual: null, valor: 400 },
  ],
  data: '2026-10-10T00:00:00.000Z',
  quitada: false,
  quitadaEm: null,
  criadoEm: '2026-11-25T00:00:00.000Z',
  atualizadoEm: '2026-11-25T00:00:00.000Z',
};

const exemplosCorpoDespesa = {
  igualitario: {
    summary: 'IGUALITARIO entre participantes selecionados',
    value: { descricao: 'Supermercado', valorTotal: 150.5, descontoPercentual: 0, tipoRateio: 'IGUALITARIO', participantes: [ID_ANA, ID_BRUNO] },
  },
  igualitarioTodos: {
    summary: 'IGUALITARIO entre todos os membros (sem "participantes")',
    value: { descricao: 'Pedágio', valorTotal: 45, tipoRateio: 'IGUALITARIO' },
  },
  percentual: {
    summary: 'PERCENTUAL (soma exata de 100%)',
    value: {
      descricao: 'Aluguel do carro', valorTotal: 600, descontoPercentual: 10, tipoRateio: 'PERCENTUAL', pagoPorId: ID_BRUNO,
      divisoes: [{ usuarioId: ID_ANA, percentual: 50 }, { usuarioId: ID_BRUNO, percentual: 25 }, { usuarioId: ID_CARLA, percentual: 25 }],
    },
  },
  valorExato: {
    summary: 'VALOR_EXATO (soma = valor líquido)',
    value: {
      descricao: 'Ingressos', valorTotal: 200, descontoPercentual: 20, tipoRateio: 'VALOR_EXATO',
      divisoes: [{ usuarioId: ID_ANA, valor: 100 }, { usuarioId: ID_CARLA, valor: 60 }],
    },
  },
};

const errosValidacaoDespesa = erro('Erro estrutural: campo obrigatório ausente, tipo incorreto, mais de 2 casas decimais, tipoRateio inválido, JSON malformado.', {
  camposObrigatorios: {
    erro: 'VALIDACAO', mensagem: 'Dados inválidos. Verifique os campos informados.',
    detalhes: [{ campo: 'descricao', mensagem: 'A descrição é obrigatória.' }, { campo: 'valorTotal', mensagem: 'O valor total é obrigatório.' }],
  },
  tipoRateio: {
    erro: 'VALIDACAO', mensagem: 'Dados inválidos. Verifique os campos informados.',
    detalhes: [{ campo: 'tipoRateio', mensagem: 'O tipoRateio deve ser um de: IGUALITARIO, PERCENTUAL, VALOR_EXATO.' }],
  },
  jsonInvalido: { erro: 'JSON_INVALIDO', mensagem: 'O corpo da requisição não é um JSON válido.' },
});
const errosRegraDespesa = erro('Violação de regra de negócio do valor, desconto ou rateio.', {
  valorForaDoLimite: { erro: 'VALOR_FORA_DO_LIMITE', mensagem: 'O valor total deve estar entre R$ 0,01 e R$ 50.000,00. Valor recebido: 50000.01.', detalhes: { minimo: 0.01, maximo: 50000, recebido: 50000.01 } },
  descontoForaDoLimite: { erro: 'DESCONTO_FORA_DO_LIMITE', mensagem: 'O desconto deve estar entre 0% e 100%.', detalhes: { minimo: 0, maximo: 100, recebido: 120 } },
  valorLiquido: { erro: 'VALOR_LIQUIDO_INVALIDO', mensagem: 'O valor líquido (após desconto) deve ser de no mínimo R$ 0,01.' },
  somaPercentuais: { erro: 'SOMA_PERCENTUAIS_INVALIDA', mensagem: 'A soma dos percentuais deve ser exatamente 100%. Soma recebida: 99.9%.', detalhes: { somaPercentuais: 99.9, esperado: 100 } },
  percentualInvalido: { erro: 'PERCENTUAL_INVALIDO', mensagem: 'Cada percentual deve ser maior que 0 e no máximo 100, com até 2 casas decimais.', detalhes: { usuarioIds: [ID_ANA] } },
  somaValores: { erro: 'SOMA_VALORES_INVALIDA', mensagem: 'A soma dos valores individuais (R$ 150.00) deve ser igual ao valor líquido da despesa (R$ 160.00).', detalhes: { somaValores: 150, valorLiquido: 160 } },
  valorIndividual: { erro: 'VALOR_INDIVIDUAL_INVALIDO', mensagem: 'Cada valor individual deve ser de no mínimo R$ 0,01, com até 2 casas decimais.', detalhes: { usuarioIds: [ID_ANA] } },
  participanteNaoMembro: { erro: 'PARTICIPANTE_NAO_MEMBRO', mensagem: 'Todos os participantes do rateio devem ser membros do grupo.', detalhes: { usuarioIds: ['650000000000000000000005'] } },
  participanteDuplicado: { erro: 'PARTICIPANTE_DUPLICADO', mensagem: 'Há participantes repetidos no rateio.', detalhes: { usuarioIds: [ID_ANA] } },
  participantesVazio: { erro: 'PARTICIPANTES_VAZIO', mensagem: 'A despesa deve ter pelo menos 1 participante.' },
  pagadorNaoMembro: { erro: 'PAGADOR_NAO_MEMBRO', mensagem: 'Quem pagou a despesa (pagoPorId) deve ser membro do grupo.', detalhes: { pagoPorId: '650000000000000000000005' } },
});

// ---------- especificação ----------
module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'RateioJusto API',
    version: '1.0.0',
    description: [
      'API de gestão e divisão proporcional de despesas compartilhadas (viagens, eventos e repúblicas).',
      '',
      '**Autenticação:** faça login em `POST /api/auth/login`, copie o `token` e clique em **Authorize** (formato `Bearer <token>`). O token vale **2 horas**.',
      '',
      '**Usuários de teste** (senha `Senha@123`): `ana@rateiojusto.com`, `bruno@rateiojusto.com`, `carla@rateiojusto.com`, `diego@rateiojusto.com`, `eva@rateiojusto.com` (sem grupos) e `membro01..membro19@rateiojusto.com`.',
      '',
      '**Formato de erro padrão:** `{ "erro": "CODIGO", "mensagem": "texto legível", "detalhes": ... }`.',
      '',
      '**Valores monetários** em reais (number, até 2 casas). Cálculos internos em centavos.',
    ].join('\n'),
  },
  servers: [{ url: `http://localhost:${config.port}`, description: 'Ambiente local' }],
  tags: [
    { name: 'Autenticação', description: 'Cadastro, login e usuário atual' },
    { name: 'Grupos', description: 'Grupos de rateio, papéis e status' },
    { name: 'Membros', description: 'Participantes do grupo (1 a 20)' },
    { name: 'Despesas', description: 'Lançamento e divisão de despesas' },
    { name: 'Balanço', description: 'Consolidação e acerto de contas' },
    { name: 'Utilitários', description: 'Health-check e reset para automação de testes' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token JWT obtido em /api/auth/login (validade: 2h).' },
    },
    schemas: {
      Erro: {
        type: 'object',
        required: ['erro', 'mensagem'],
        properties: {
          erro: { type: 'string', description: 'Código semântico do erro', example: 'VALIDACAO' },
          mensagem: { type: 'string', description: 'Mensagem legível', example: 'Dados inválidos. Verifique os campos informados.' },
          detalhes: {
            description: 'Detalhes opcionais: lista de erros por campo (400) ou dados do conflito (422)',
            oneOf: [
              { type: 'array', items: { type: 'object', properties: { campo: { type: 'string' }, mensagem: { type: 'string' } } } },
              { type: 'object', additionalProperties: true },
            ],
          },
        },
      },
      RegistroRequest: {
        type: 'object',
        required: ['nome', 'email', 'senha'],
        properties: {
          nome: { type: 'string', maxLength: 100, example: 'Fernanda Alves' },
          email: { type: 'string', format: 'email', description: 'Único (case-insensitive)', example: 'fernanda@exemplo.com' },
          senha: { type: 'string', minLength: 8, description: 'Mínimo 8 caracteres, com ao menos 1 letra maiúscula, 1 número e 1 caractere especial', example: 'Segura@2026' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'senha'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ana@rateiojusto.com' },
          senha: { type: 'string', example: 'Senha@123' },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'string', example: ID_ANA },
          nome: { type: 'string', example: 'Ana Souza' },
          email: { type: 'string', example: 'ana@rateiojusto.com' },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          tipo: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'integer', description: 'Validade em segundos', example: 7200 },
          expiraEm: { type: 'string', format: 'date-time' },
          usuario: ref('Usuario'),
        },
      },
      GrupoRequest: {
        type: 'object',
        required: ['nome'],
        properties: {
          nome: { type: 'string', maxLength: 100, example: 'Viagem Serra Gaúcha' },
          descricao: { type: 'string', maxLength: 200, example: 'Feriado de dezembro' },
        },
      },
      Membro: {
        type: 'object',
        properties: {
          usuarioId: { type: 'string', example: ID_BRUNO },
          nome: { type: 'string', example: 'Bruno Lima' },
          email: { type: 'string', example: 'bruno@rateiojusto.com' },
          papel: { type: 'string', enum: ['ADMIN', 'MEMBRO'], example: 'MEMBRO' },
          adicionadoEm: { type: 'string', format: 'date-time' },
        },
      },
      Grupo: {
        type: 'object',
        properties: {
          id: { type: 'string', example: ID_GRUPO },
          nome: { type: 'string', example: 'Viagem Floripa 2026' },
          descricao: { type: 'string' },
          status: { type: 'string', enum: ['ABERTO', 'FECHADO'], example: 'ABERTO' },
          meuPapel: { type: 'string', enum: ['ADMIN', 'MEMBRO'], description: 'Papel do usuário autenticado no grupo' },
          totalMembros: { type: 'integer', example: 3 },
          limiteMembros: { type: 'integer', example: 20 },
          criadoPor: { type: 'string', example: ID_ANA },
          membros: { type: 'array', items: ref('Membro') },
          criadoEm: { type: 'string', format: 'date-time' },
          fechadoEm: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      GrupoResumo: {
        allOf: [
          ref('Grupo'),
          {
            type: 'object',
            properties: {
              quantidadeDespesas: { type: 'integer', example: 4 },
              totalGasto: { type: 'number', example: 1905 },
            },
          },
        ],
      },
      AdicionarMembroRequest: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email', example: 'diego@rateiojusto.com' } },
      },
      DivisaoPercentual: {
        type: 'object',
        required: ['usuarioId', 'percentual'],
        properties: {
          usuarioId: { type: 'string', example: ID_ANA },
          percentual: { type: 'number', exclusiveMinimum: true, minimum: 0, maximum: 100, description: 'Até 2 casas decimais', example: 50 },
        },
      },
      DivisaoValor: {
        type: 'object',
        required: ['usuarioId', 'valor'],
        properties: {
          usuarioId: { type: 'string', example: ID_ANA },
          valor: { type: 'number', minimum: 0.01, description: 'Até 2 casas decimais', example: 100 },
        },
      },
      DespesaRequest: {
        type: 'object',
        required: ['descricao', 'valorTotal', 'tipoRateio'],
        properties: {
          descricao: { type: 'string', maxLength: 200, example: 'Supermercado' },
          valorTotal: { type: 'number', minimum: 0.01, maximum: 50000, description: 'R$ 0,01 a R$ 50.000,00, até 2 casas decimais', example: 150.5 },
          descontoPercentual: {
            type: 'number', minimum: 0, maximum: 100, default: 0,
            description: '0 a 50% para qualquer participante. Acima de 50% (até 100%) apenas o ADMIN do grupo (senão 403). Até 2 casas decimais.',
            example: 10,
          },
          tipoRateio: { type: 'string', enum: ['IGUALITARIO', 'PERCENTUAL', 'VALOR_EXATO'] },
          pagoPorId: { type: 'string', description: 'Quem pagou (membro do grupo). Padrão: usuário autenticado.', example: ID_ANA },
          data: { type: 'string', format: 'date', description: 'Data da despesa (ISO 8601). Padrão: agora.', example: '2026-11-20' },
          participantes: {
            type: 'array', items: { type: 'string' },
            description: 'Somente IGUALITARIO: ids dos participantes selecionados. Se omitido, divide entre todos os membros.',
          },
          divisoes: {
            type: 'array',
            description: 'Obrigatório para PERCENTUAL ([{usuarioId, percentual}]) e VALOR_EXATO ([{usuarioId, valor}]).',
            items: { oneOf: [ref('DivisaoPercentual'), ref('DivisaoValor')] },
          },
        },
      },
      Despesa: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          grupoId: { type: 'string' },
          descricao: { type: 'string' },
          valorTotal: { type: 'number' },
          descontoPercentual: { type: 'number' },
          valorDesconto: { type: 'number' },
          valorLiquido: { type: 'number', description: 'valorTotal - desconto (arredondado ao centavo, meio para cima)' },
          tipoRateio: { type: 'string', enum: ['IGUALITARIO', 'PERCENTUAL', 'VALOR_EXATO'] },
          autor: { type: 'object', properties: { id: { type: 'string' }, nome: { type: 'string' }, email: { type: 'string' } } },
          pagoPor: { type: 'object', properties: { id: { type: 'string' }, nome: { type: 'string' }, email: { type: 'string' } } },
          divisoes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                usuarioId: { type: 'string' },
                nome: { type: 'string' },
                percentual: { type: 'number', nullable: true },
                valor: { type: 'number' },
              },
            },
          },
          data: { type: 'string', format: 'date-time' },
          quitada: { type: 'boolean' },
          quitadaEm: { type: 'string', format: 'date-time', nullable: true },
          criadoEm: { type: 'string', format: 'date-time' },
          atualizadoEm: { type: 'string', format: 'date-time' },
        },
        example: exemploDespesa,
      },
      Balanco: {
        type: 'object',
        properties: {
          grupoId: { type: 'string' },
          grupoNome: { type: 'string' },
          status: { type: 'string', enum: ['ABERTO', 'FECHADO'] },
          totalGasto: { type: 'number', description: 'Soma dos valores líquidos de TODAS as despesas (inclui quitadas)' },
          totalPendente: { type: 'number', description: 'Soma das despesas não quitadas (base dos saldos)' },
          totalQuitado: { type: 'number' },
          quantidadeDespesas: { type: 'integer' },
          quantidadeDespesasPendentes: { type: 'integer' },
          membros: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                usuarioId: { type: 'string' },
                nome: { type: 'string' },
                email: { type: 'string' },
                papel: { type: 'string', enum: ['ADMIN', 'MEMBRO'] },
                totalPago: { type: 'number', description: 'Quanto pagou (despesas pendentes)' },
                totalDevido: { type: 'number', description: 'Quanto deveria pagar (despesas pendentes)' },
                saldo: { type: 'number', description: 'totalPago - totalDevido (positivo = a receber; negativo = a pagar)' },
                situacao: { type: 'string', enum: ['A_RECEBER', 'A_PAGAR', 'QUITE'] },
              },
            },
          },
          transferencias: {
            type: 'array',
            description: 'Lista simplificada "quem paga quanto para quem" para zerar os saldos',
            items: {
              type: 'object',
              properties: {
                deUsuarioId: { type: 'string' },
                deNome: { type: 'string' },
                paraUsuarioId: { type: 'string' },
                paraNome: { type: 'string' },
                valor: { type: 'number' },
              },
            },
          },
        },
        example: {
          grupoId: ID_GRUPO, grupoNome: 'Viagem Floripa 2026', status: 'ABERTO',
          totalGasto: 1905, totalPendente: 1725, totalQuitado: 180, quantidadeDespesas: 4, quantidadeDespesasPendentes: 3,
          membros: [
            { usuarioId: ID_ANA, nome: 'Ana Souza', email: 'ana@rateiojusto.com', papel: 'ADMIN', totalPago: 1200, totalDevido: 650, saldo: 550, situacao: 'A_RECEBER' },
            { usuarioId: ID_BRUNO, nome: 'Bruno Lima', email: 'bruno@rateiojusto.com', papel: 'MEMBRO', totalPago: 300, totalDevido: 565, saldo: -265, situacao: 'A_PAGAR' },
            { usuarioId: ID_CARLA, nome: 'Carla Mendes', email: 'carla@rateiojusto.com', papel: 'MEMBRO', totalPago: 225, totalDevido: 510, saldo: -285, situacao: 'A_PAGAR' },
          ],
          transferencias: [
            { deUsuarioId: ID_CARLA, deNome: 'Carla Mendes', paraUsuarioId: ID_ANA, paraNome: 'Ana Souza', valor: 285 },
            { deUsuarioId: ID_BRUNO, deNome: 'Bruno Lima', paraUsuarioId: ID_ANA, paraNome: 'Ana Souza', valor: 265 },
          ],
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Utilitários'], summary: 'Health-check (sem autenticação)',
        responses: { 200: ok('API no ar', { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' } } }, { status: 'ok', timestamp: '2026-11-25T00:00:00.000Z' }) },
      },
    },
    '/api/test/reset': {
      post: {
        tags: ['Utilitários'], summary: 'Restaura o banco para os dados de seed',
        description: 'Apaga todos os dados e recarrega o seed (IDs fixos). Disponível apenas fora de produção (ENABLE_TEST_ROUTES). Sem autenticação.',
        responses: { 200: ok('Banco restaurado', { type: 'object' }, { mensagem: 'Banco restaurado para os dados de seed.', usuarios: 24, grupos: 5, despesas: 7 }) },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Autenticação'], summary: 'Cadastrar usuário',
        requestBody: corpo(ref('RegistroRequest')),
        responses: {
          201: ok('Usuário criado (a senha nunca é retornada)', ref('Usuario')),
          400: erro('Dados inválidos (campos obrigatórios, formato do e-mail, política de senha).', {
            obrigatorios: { erro: 'VALIDACAO', mensagem: 'Dados inválidos. Verifique os campos informados.', detalhes: [{ campo: 'nome', mensagem: 'O nome é obrigatório.' }] },
            emailInvalido: { erro: 'VALIDACAO', mensagem: 'Dados inválidos. Verifique os campos informados.', detalhes: [{ campo: 'email', mensagem: 'O e-mail informado não tem um formato válido.' }] },
            senhaFraca: {
              erro: 'VALIDACAO', mensagem: 'Dados inválidos. Verifique os campos informados.',
              detalhes: [
                { campo: 'senha', mensagem: 'A senha deve ter no mínimo 8 caracteres.' },
                { campo: 'senha', mensagem: 'A senha deve conter pelo menos 1 letra maiúscula.' },
                { campo: 'senha', mensagem: 'A senha deve conter pelo menos 1 número.' },
                { campo: 'senha', mensagem: 'A senha deve conter pelo menos 1 caractere especial.' },
              ],
            },
          }),
          409: erro('E-mail já cadastrado.', { emailDuplicado: { erro: 'EMAIL_JA_CADASTRADO', mensagem: 'Já existe um usuário cadastrado com este e-mail.' } }),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticação'], summary: 'Login (retorna JWT válido por 2 horas)',
        requestBody: corpo(ref('LoginRequest')),
        responses: {
          200: ok('Login realizado', ref('LoginResponse')),
          400: erro('Campos obrigatórios ausentes.', { obrigatorios: { erro: 'VALIDACAO', mensagem: 'Dados inválidos. Verifique os campos informados.', detalhes: [{ campo: 'senha', mensagem: 'A senha é obrigatória.' }] } }),
          401: erro('Credenciais inválidas.', { credenciais: { erro: 'NAO_AUTENTICADO', mensagem: 'E-mail ou senha inválidos.' } }),
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Autenticação'], summary: 'Dados do usuário autenticado', security: [{ bearerAuth: [] }],
        responses: { 200: ok('Usuário autenticado', ref('Usuario')), 401: E401 },
      },
    },
    '/api/grupos': {
      get: {
        tags: ['Grupos'], summary: 'Listar grupos do usuário autenticado', security: [{ bearerAuth: [] }],
        description: 'Retorna apenas os grupos dos quais o usuário participa, com status, papel (meuPapel), total de despesas e total gasto.',
        responses: { 200: ok('Lista de grupos', { type: 'array', items: ref('GrupoResumo') }), 401: E401 },
      },
      post: {
        tags: ['Grupos'], summary: 'Criar grupo (criador vira ADMIN; status inicial ABERTO)', security: [{ bearerAuth: [] }],
        requestBody: corpo(ref('GrupoRequest')),
        responses: {
          201: ok('Grupo criado', ref('Grupo')),
          400: erro('Dados inválidos.', { nome: { erro: 'VALIDACAO', mensagem: 'Dados inválidos. Verifique os campos informados.', detalhes: [{ campo: 'nome', mensagem: 'O nome do grupo é obrigatório.' }] } }),
          401: E401,
        },
      },
    },
    '/api/grupos/{id}': {
      get: {
        tags: ['Grupos'], summary: 'Detalhar grupo', security: [{ bearerAuth: [] }], parameters: [paramGrupo],
        responses: { 200: ok('Grupo', ref('Grupo')), 401: E401, 403: erro('Usuário não participa do grupo.', { naoMembro: E403_NAO_MEMBRO }), 404: E404_GRUPO },
      },
      delete: {
        tags: ['Grupos'], summary: 'Excluir grupo (somente ADMIN; remove também as despesas)', security: [{ bearerAuth: [] }], parameters: [paramGrupo],
        responses: {
          204: { description: 'Grupo excluído' },
          401: E401,
          403: erro('Não participante ou MEMBRO.', { naoMembro: E403_NAO_MEMBRO, membro: { erro: 'ACESSO_NEGADO', mensagem: 'Apenas o ADMIN do grupo pode excluir o grupo.' } }),
          404: E404_GRUPO,
        },
      },
    },
    '/api/grupos/{id}/fechar': {
      patch: {
        tags: ['Grupos'], summary: 'Fechar grupo (ABERTO → FECHADO, somente ADMIN)', security: [{ bearerAuth: [] }], parameters: [paramGrupo],
        description: 'Após fechado, não é possível criar, editar ou excluir despesas (409). A operação é irreversível.',
        responses: {
          200: ok('Grupo fechado', ref('Grupo')),
          401: E401,
          403: erro('Não participante ou MEMBRO.', { naoMembro: E403_NAO_MEMBRO, membro: { erro: 'ACESSO_NEGADO', mensagem: 'Apenas o ADMIN do grupo pode fechar o grupo.' } }),
          404: E404_GRUPO,
          409: erro('Grupo já está fechado.', { jaFechado: { erro: 'GRUPO_JA_FECHADO', mensagem: 'O grupo já está FECHADO.' } }),
        },
      },
    },
    '/api/grupos/{id}/membros': {
      get: {
        tags: ['Membros'], summary: 'Listar membros do grupo', security: [{ bearerAuth: [] }], parameters: [paramGrupo],
        responses: { 200: ok('Membros', { type: 'array', items: ref('Membro') }), 401: E401, 403: erro('Usuário não participa do grupo.', { naoMembro: E403_NAO_MEMBRO }), 404: E404_GRUPO },
      },
      post: {
        tags: ['Membros'], summary: 'Adicionar membro por e-mail (somente ADMIN; entra como MEMBRO)', security: [{ bearerAuth: [] }], parameters: [paramGrupo],
        requestBody: corpo(ref('AdicionarMembroRequest')),
        responses: {
          201: ok('Membro adicionado', ref('Membro')),
          400: erro('E-mail ausente ou inválido.', { email: { erro: 'VALIDACAO', mensagem: 'Dados inválidos. Verifique os campos informados.', detalhes: [{ campo: 'email', mensagem: 'O e-mail informado não tem um formato válido.' }] } }),
          401: E401,
          403: erro('Não participante ou MEMBRO.', { naoMembro: E403_NAO_MEMBRO, membro: { erro: 'ACESSO_NEGADO', mensagem: 'Apenas o ADMIN do grupo pode adicionar membros.' } }),
          404: erro('Grupo inexistente ou nenhum usuário com o e-mail.', { grupo: { erro: 'NAO_ENCONTRADO', mensagem: 'Grupo não encontrado.' }, usuario: { erro: 'NAO_ENCONTRADO', mensagem: 'Nenhum usuário cadastrado com este e-mail.' } }),
          409: erro('Usuário já é participante.', { jaMembro: { erro: 'MEMBRO_JA_EXISTE', mensagem: 'Este usuário já é participante do grupo.' } }),
          422: erro('Limite de 20 participantes atingido (tentativa de adicionar o 21º).', {
            limite: { erro: 'LIMITE_PARTICIPANTES_EXCEDIDO', mensagem: 'O grupo já atingiu o limite máximo de 20 participantes.', detalhes: { limite: 20, atual: 20 } },
          }),
        },
      },
    },
    '/api/grupos/{id}/membros/{usuarioId}': {
      delete: {
        tags: ['Membros'], summary: 'Remover membro (somente ADMIN)', security: [{ bearerAuth: [] }],
        parameters: [paramGrupo, { name: 'usuarioId', in: 'path', required: true, schema: { type: 'string', example: '650000000000000000000004' } }],
        description: 'O ADMIN não pode ser removido (o grupo deve manter no mínimo 1 participante). Membros que participam de despesas não podem ser removidos.',
        responses: {
          204: { description: 'Membro removido' },
          401: E401,
          403: erro('Não participante ou MEMBRO.', { membro: { erro: 'ACESSO_NEGADO', mensagem: 'Apenas o ADMIN do grupo pode remover membros.' } }),
          404: erro('Grupo ou membro não encontrado.', { membro: { erro: 'NAO_ENCONTRADO', mensagem: 'Membro não encontrado neste grupo.' } }),
          409: erro('Membro participa de despesas.', { comDespesas: { erro: 'MEMBRO_COM_DESPESAS', mensagem: 'Não é possível remover um membro que participa de despesas do grupo.' } }),
          422: erro('Tentativa de remover o ADMIN / ficar abaixo do mínimo.', { admin: { erro: 'REMOCAO_ADMIN_NAO_PERMITIDA', mensagem: 'O ADMIN não pode ser removido: o grupo deve ter no mínimo 1 participante e sempre um ADMIN.' } }),
        },
      },
    },
    '/api/grupos/{id}/despesas': {
      get: {
        tags: ['Despesas'], summary: 'Listar despesas do grupo', security: [{ bearerAuth: [] }], parameters: [paramGrupo],
        responses: {
          200: ok('Despesas (mais recentes primeiro)', { type: 'array', items: ref('Despesa') }),
          401: E401,
          403: erro('Usuário não participa do grupo.', { naoMembro: E403_NAO_MEMBRO }),
          404: E404_GRUPO,
        },
      },
      post: {
        tags: ['Despesas'], summary: 'Criar despesa', security: [{ bearerAuth: [] }], parameters: [paramGrupo],
        description: [
          'Ordem das validações: 401 → 404 grupo → 403 não participante → 409 grupo FECHADO → 400 estrutura → 422 valor/desconto → 403 desconto > 50% sem ser ADMIN → 422 valor líquido → 422 pagador → 422 rateio.',
          '',
          '- **IGUALITARIO**: divide o valor líquido igualmente entre `participantes` (ou todos os membros). Centavos restantes vão, 1 a 1, para os primeiros participantes da lista.',
          '- **PERCENTUAL**: `divisoes` com `{usuarioId, percentual}`; soma exatamente 100 (tolerância zero). Cada parte = piso(líquido × %); centavos restantes 1 a 1 na ordem da lista.',
          '- **VALOR_EXATO**: `divisoes` com `{usuarioId, valor}`; soma igual ao valor líquido, ao centavo.',
        ].join('\n'),
        requestBody: corpo(ref('DespesaRequest'), exemplosCorpoDespesa),
        responses: {
          201: ok('Despesa criada', ref('Despesa')),
          400: errosValidacaoDespesa,
          401: E401,
          403: erro('Não participante ou desconto acima de 50% sem ser ADMIN.', {
            naoMembro: E403_NAO_MEMBRO,
            descontoRequerAdmin: { erro: 'DESCONTO_REQUER_ADMIN', mensagem: 'Descontos acima de 50% só podem ser lançados pelo ADMIN do grupo.' },
          }),
          404: E404_GRUPO,
          409: erro('Grupo FECHADO.', { grupoFechado: { erro: 'GRUPO_FECHADO', mensagem: 'Não é permitido criar despesas em um grupo FECHADO.' } }),
          422: errosRegraDespesa,
        },
      },
    },
    '/api/grupos/{id}/despesas/{despesaId}': {
      get: {
        tags: ['Despesas'], summary: 'Detalhar despesa', security: [{ bearerAuth: [] }], parameters: [paramGrupo, paramDespesa],
        responses: { 200: ok('Despesa', ref('Despesa')), 401: E401, 403: erro('Usuário não participa do grupo.', { naoMembro: E403_NAO_MEMBRO }), 404: E404_DESPESA },
      },
      put: {
        tags: ['Despesas'], summary: 'Editar despesa (substituição completa; autor ou ADMIN)', security: [{ bearerAuth: [] }], parameters: [paramGrupo, paramDespesa],
        description: 'Ordem: 401 → 404 grupo → 403 não participante → 404 despesa → 409 grupo FECHADO → 409 despesa QUITADA → 403 não é autor nem ADMIN → mesmas validações da criação. O autor original é mantido.',
        requestBody: corpo(ref('DespesaRequest'), exemplosCorpoDespesa),
        responses: {
          200: ok('Despesa atualizada', ref('Despesa')),
          400: errosValidacaoDespesa,
          401: E401,
          403: erro('Não participante, não é autor/ADMIN, ou desconto > 50% sem ser ADMIN.', {
            naoMembro: E403_NAO_MEMBRO,
            naoAutor: { erro: 'ACESSO_NEGADO', mensagem: 'Apenas o autor da despesa ou o ADMIN do grupo pode editar esta despesa.' },
            descontoRequerAdmin: { erro: 'DESCONTO_REQUER_ADMIN', mensagem: 'Descontos acima de 50% só podem ser lançados pelo ADMIN do grupo.' },
          }),
          404: E404_DESPESA,
          409: erro('Grupo FECHADO ou despesa QUITADA.', {
            grupoFechado: { erro: 'GRUPO_FECHADO', mensagem: 'Não é permitido editar despesas em um grupo FECHADO.' },
            quitada: { erro: 'DESPESA_QUITADA', mensagem: 'Despesa QUITADA não pode ser editada.' },
          }),
          422: errosRegraDespesa,
        },
      },
      delete: {
        tags: ['Despesas'], summary: 'Excluir despesa (autor ou ADMIN)', security: [{ bearerAuth: [] }], parameters: [paramGrupo, paramDespesa],
        description: 'Ordem: 401 → 404 grupo → 403 não participante → 404 despesa → 409 grupo FECHADO → 409 despesa QUITADA → 403 não é autor nem ADMIN.',
        responses: {
          204: { description: 'Despesa excluída' },
          401: E401,
          403: erro('Não participante ou não é autor/ADMIN.', {
            naoMembro: E403_NAO_MEMBRO,
            naoAutor: { erro: 'ACESSO_NEGADO', mensagem: 'Apenas o autor da despesa ou o ADMIN do grupo pode excluir esta despesa.' },
          }),
          404: E404_DESPESA,
          409: erro('Grupo FECHADO ou despesa QUITADA.', {
            grupoFechado: { erro: 'GRUPO_FECHADO', mensagem: 'Não é permitido excluir despesas em um grupo FECHADO.' },
            quitada: { erro: 'DESPESA_QUITADA', mensagem: 'Despesa QUITADA não pode ser excluída.' },
          }),
        },
      },
    },
    '/api/grupos/{id}/despesas/{despesaId}/quitar': {
      patch: {
        tags: ['Despesas'], summary: 'Marcar despesa como QUITADA (autor ou ADMIN)', security: [{ bearerAuth: [] }], parameters: [paramGrupo, paramDespesa],
        description: 'Despesas quitadas deixam de compor os saldos do balanço e não podem mais ser editadas/excluídas. Permitido também em grupos FECHADOS (acerto de contas após o fechamento). Irreversível.',
        responses: {
          200: ok('Despesa quitada', ref('Despesa')),
          401: E401,
          403: erro('Não participante ou não é autor/ADMIN.', { naoAutor: { erro: 'ACESSO_NEGADO', mensagem: 'Apenas o autor da despesa ou o ADMIN do grupo pode quitá-la.' } }),
          404: E404_DESPESA,
          409: erro('Despesa já quitada.', { jaQuitada: { erro: 'DESPESA_JA_QUITADA', mensagem: 'A despesa já está QUITADA.' } }),
        },
      },
    },
    '/api/grupos/{id}/balanco': {
      get: {
        tags: ['Balanço'], summary: 'Balanço e acerto de contas do grupo', security: [{ bearerAuth: [] }], parameters: [paramGrupo],
        description: [
          '- **totalGasto**: soma dos valores líquidos de todas as despesas.',
          '- **totalPago / totalDevido / saldo** por membro: calculados sobre as despesas **não quitadas**.',
          '- **saldo** = pago − devido (positivo = tem a receber; negativo = deve pagar). A soma dos saldos é sempre 0.',
          '- **transferencias**: algoritmo guloso (maior devedor paga ao maior credor) que zera todos os saldos com no máximo N−1 transferências.',
        ].join('\n'),
        responses: { 200: ok('Balanço', ref('Balanco')), 401: E401, 403: erro('Usuário não participa do grupo.', { naoMembro: E403_NAO_MEMBRO }), 404: E404_GRUPO },
      },
    },
  },
};
