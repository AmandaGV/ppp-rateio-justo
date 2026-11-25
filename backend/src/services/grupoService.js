'use strict';

const Grupo = require('../models/Grupo');
const Usuario = require('../models/Usuario');
const Despesa = require('../models/Despesa');
const AppError = require('../utils/AppError');
const { PAPEIS, STATUS_GRUPO, MAX_PARTICIPANTES, MIN_PARTICIPANTES, NOME_MAX_CARACTERES, DESCRICAO_MAX_CARACTERES } = require('../utils/regras');
const { ehTextoPreenchido, validarEmail, lancarSeHouverErros, exigirIdValido } = require('../utils/validacao');

const CAMPOS_USUARIO = 'nome email';

// ---------- helpers de autorização (reutilizados pelo serviço de despesas) ----------

/** Carrega o grupo (com membros populados) ou lança 404. */
async function carregarGrupo(grupoId) {
  exigirIdValido(grupoId, 'Grupo');
  const grupo = await Grupo.findById(grupoId).populate('membros.usuario', CAMPOS_USUARIO);
  if (!grupo) throw AppError.naoEncontrado('Grupo não encontrado.');
  return grupo;
}

/** Retorna o vínculo do usuário com o grupo ou lança 403 se ele não for participante. */
function exigirMembro(grupo, usuario) {
  const membro = grupo.buscarMembro(usuario._id);
  if (!membro) throw AppError.acessoNegado('Você não é participante deste grupo.');
  return membro;
}

/** Lança 403 se o usuário não for ADMIN do grupo. */
function exigirAdmin(grupo, usuario, acao) {
  const membro = exigirMembro(grupo, usuario);
  if (membro.papel !== PAPEIS.ADMIN) throw AppError.acessoNegado(`Apenas o ADMIN do grupo pode ${acao}.`);
  return membro;
}

function idDoMembro(m) {
  return (m.usuario._id || m.usuario).toString();
}

// ---------- formatação ----------

function formatarMembro(m) {
  return {
    usuarioId: idDoMembro(m),
    nome: m.usuario.nome,
    email: m.usuario.email,
    papel: m.papel,
    adicionadoEm: m.adicionadoEm,
  };
}

function formatarGrupo(grupo, usuario, extras = {}) {
  const meu = grupo.buscarMembro(usuario._id);
  return {
    id: grupo._id.toString(),
    nome: grupo.nome,
    descricao: grupo.descricao,
    status: grupo.status,
    meuPapel: meu ? meu.papel : null,
    totalMembros: grupo.membros.length,
    limiteMembros: MAX_PARTICIPANTES,
    criadoPor: grupo.criadoPor.toString(),
    membros: grupo.membros.map(formatarMembro),
    criadoEm: grupo.criadoEm,
    fechadoEm: grupo.fechadoEm,
    ...extras,
  };
}

// ---------- casos de uso ----------

async function listar(usuario) {
  const grupos = await Grupo.find({ 'membros.usuario': usuario._id })
    .populate('membros.usuario', CAMPOS_USUARIO)
    .sort({ criadoEm: -1 });

  const contagens = await Despesa.aggregate([
    { $match: { grupo: { $in: grupos.map((g) => g._id) } } },
    { $group: { _id: '$grupo', quantidade: { $sum: 1 }, totalCentavos: { $sum: '$valorLiquidoCentavos' } } },
  ]);
  const porGrupo = new Map(contagens.map((c) => [c._id.toString(), c]));

  return grupos.map((g) => {
    const c = porGrupo.get(g._id.toString());
    return formatarGrupo(g, usuario, {
      quantidadeDespesas: c ? c.quantidade : 0,
      totalGasto: c ? c.totalCentavos / 100 : 0,
    });
  });
}

function validarDadosGrupo({ nome, descricao } = {}) {
  const erros = [];
  if (!ehTextoPreenchido(nome)) erros.push({ campo: 'nome', mensagem: 'O nome do grupo é obrigatório.' });
  else if (nome.trim().length > NOME_MAX_CARACTERES) erros.push({ campo: 'nome', mensagem: `O nome deve ter no máximo ${NOME_MAX_CARACTERES} caracteres.` });
  if (descricao !== undefined && descricao !== null && typeof descricao !== 'string') {
    erros.push({ campo: 'descricao', mensagem: 'A descrição deve ser um texto.' });
  } else if (typeof descricao === 'string' && descricao.trim().length > DESCRICAO_MAX_CARACTERES) {
    erros.push({ campo: 'descricao', mensagem: `A descrição deve ter no máximo ${DESCRICAO_MAX_CARACTERES} caracteres.` });
  }
  lancarSeHouverErros(erros);
}

async function criar(usuario, dados = {}) {
  validarDadosGrupo(dados);
  const grupo = await Grupo.create({
    nome: dados.nome.trim(),
    descricao: (dados.descricao || '').trim(),
    criadoPor: usuario._id,
    membros: [{ usuario: usuario._id, papel: PAPEIS.ADMIN }],
  });
  await grupo.populate('membros.usuario', CAMPOS_USUARIO);
  return formatarGrupo(grupo, usuario);
}

async function obter(usuario, grupoId) {
  const grupo = await carregarGrupo(grupoId);
  exigirMembro(grupo, usuario);
  return formatarGrupo(grupo, usuario);
}

async function excluir(usuario, grupoId) {
  const grupo = await carregarGrupo(grupoId);
  exigirAdmin(grupo, usuario, 'excluir o grupo');
  await Despesa.deleteMany({ grupo: grupo._id });
  await grupo.deleteOne();
}

async function fechar(usuario, grupoId) {
  const grupo = await carregarGrupo(grupoId);
  exigirAdmin(grupo, usuario, 'fechar o grupo');
  if (grupo.status === STATUS_GRUPO.FECHADO) {
    throw AppError.conflito('O grupo já está FECHADO.', 'GRUPO_JA_FECHADO');
  }
  grupo.status = STATUS_GRUPO.FECHADO;
  grupo.fechadoEm = new Date();
  await grupo.save();
  return formatarGrupo(grupo, usuario);
}

async function listarMembros(usuario, grupoId) {
  const grupo = await carregarGrupo(grupoId);
  exigirMembro(grupo, usuario);
  return grupo.membros.map(formatarMembro);
}

async function adicionarMembro(usuario, grupoId, { email } = {}) {
  const grupo = await carregarGrupo(grupoId);
  exigirAdmin(grupo, usuario, 'adicionar membros');

  const erros = [];
  if (!ehTextoPreenchido(email)) erros.push({ campo: 'email', mensagem: 'O e-mail é obrigatório.' });
  else if (!validarEmail(email)) erros.push({ campo: 'email', mensagem: 'O e-mail informado não tem um formato válido.' });
  lancarSeHouverErros(erros);

  const novo = await Usuario.findOne({ email: email.trim().toLowerCase() });
  if (!novo) throw AppError.naoEncontrado('Nenhum usuário cadastrado com este e-mail.');
  if (grupo.buscarMembro(novo._id)) throw AppError.conflito('Este usuário já é participante do grupo.', 'MEMBRO_JA_EXISTE');

  if (grupo.membros.length >= MAX_PARTICIPANTES) {
    throw AppError.regraNegocio(
      `O grupo já atingiu o limite máximo de ${MAX_PARTICIPANTES} participantes.`,
      { limite: MAX_PARTICIPANTES, atual: grupo.membros.length },
      'LIMITE_PARTICIPANTES_EXCEDIDO'
    );
  }

  grupo.membros.push({ usuario: novo._id, papel: PAPEIS.MEMBRO });
  await grupo.save();
  await grupo.populate('membros.usuario', CAMPOS_USUARIO);
  return formatarMembro(grupo.buscarMembro(novo._id));
}

async function removerMembro(usuario, grupoId, usuarioId) {
  const grupo = await carregarGrupo(grupoId);
  exigirAdmin(grupo, usuario, 'remover membros');
  exigirIdValido(usuarioId, 'Membro');

  const alvo = grupo.buscarMembro(usuarioId);
  if (!alvo) throw AppError.naoEncontrado('Membro não encontrado neste grupo.');

  if (alvo.papel === PAPEIS.ADMIN || grupo.membros.length <= MIN_PARTICIPANTES) {
    throw AppError.regraNegocio(
      `O ADMIN não pode ser removido: o grupo deve ter no mínimo ${MIN_PARTICIPANTES} participante e sempre um ADMIN.`,
      undefined,
      'REMOCAO_ADMIN_NAO_PERMITIDA'
    );
  }

  const possuiDespesas = await Despesa.exists({
    grupo: grupo._id,
    $or: [{ pagoPor: usuarioId }, { autor: usuarioId }, { 'divisoes.usuario': usuarioId }],
  });
  if (possuiDespesas) {
    throw AppError.conflito('Não é possível remover um membro que participa de despesas do grupo.', 'MEMBRO_COM_DESPESAS');
  }

  grupo.membros = grupo.membros.filter((m) => idDoMembro(m) !== usuarioId);
  await grupo.save();
}

module.exports = {
  carregarGrupo,
  exigirMembro,
  exigirAdmin,
  idDoMembro,
  listar,
  criar,
  obter,
  excluir,
  fechar,
  listarMembros,
  adicionarMembro,
  removerMembro,
};
