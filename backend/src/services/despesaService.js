'use strict';

const Despesa = require('../models/Despesa');
const AppError = require('../utils/AppError');
const grupoService = require('./grupoService');
const { calcularDivisoes } = require('./rateioService');
const { calcularBalanco } = require('./balancoService');
const { temNoMaximoDuasCasas, paraCentavos, paraReais, aplicarDesconto } = require('../utils/dinheiro');
const {
  PAPEIS, STATUS_GRUPO, TIPOS_RATEIO, VALOR_MINIMO, VALOR_MAXIMO,
  DESCONTO_MINIMO, DESCONTO_MAXIMO, DESCONTO_MAXIMO_MEMBRO, DESCRICAO_MAX_CARACTERES,
} = require('../utils/regras');
const { ehTextoPreenchido, ehNumero, ehObjectId, lancarSeHouverErros, exigirIdValido } = require('../utils/validacao');

const POPULAR = [
  { path: 'autor', select: 'nome email' },
  { path: 'pagoPor', select: 'nome email' },
  { path: 'divisoes.usuario', select: 'nome email' },
];

function formatarUsuario(u) {
  return { id: (u._id || u).toString(), nome: u.nome, email: u.email };
}

function formatarDespesa(d) {
  return {
    id: d._id.toString(),
    grupoId: d.grupo.toString(),
    descricao: d.descricao,
    valorTotal: paraReais(d.valorTotalCentavos),
    descontoPercentual: d.descontoPercentual,
    valorDesconto: paraReais(d.valorTotalCentavos - d.valorLiquidoCentavos),
    valorLiquido: paraReais(d.valorLiquidoCentavos),
    tipoRateio: d.tipoRateio,
    autor: formatarUsuario(d.autor),
    pagoPor: formatarUsuario(d.pagoPor),
    divisoes: d.divisoes.map((div) => ({
      usuarioId: (div.usuario._id || div.usuario).toString(),
      nome: div.usuario.nome,
      percentual: div.percentual,
      valor: paraReais(div.valorCentavos),
    })),
    data: d.data,
    quitada: d.quitada,
    quitadaEm: d.quitadaEm,
    criadoEm: d.criadoEm,
    atualizadoEm: d.atualizadoEm,
  };
}

// ---------- validações ----------

/** Validação estrutural (tipos, obrigatoriedade, formato) => 400. */
function validarEstrutura(body) {
  const erros = [];
  const b = body || {};

  if (!ehTextoPreenchido(b.descricao)) erros.push({ campo: 'descricao', mensagem: 'A descrição é obrigatória.' });
  else if (b.descricao.trim().length > DESCRICAO_MAX_CARACTERES) erros.push({ campo: 'descricao', mensagem: `A descrição deve ter no máximo ${DESCRICAO_MAX_CARACTERES} caracteres.` });

  if (b.valorTotal === undefined || b.valorTotal === null) erros.push({ campo: 'valorTotal', mensagem: 'O valor total é obrigatório.' });
  else if (!ehNumero(b.valorTotal)) erros.push({ campo: 'valorTotal', mensagem: 'O valor total deve ser numérico.' });
  else if (!temNoMaximoDuasCasas(b.valorTotal)) erros.push({ campo: 'valorTotal', mensagem: 'O valor total deve ter no máximo 2 casas decimais.' });

  if (b.descontoPercentual !== undefined && b.descontoPercentual !== null) {
    if (!ehNumero(b.descontoPercentual)) erros.push({ campo: 'descontoPercentual', mensagem: 'O desconto deve ser numérico.' });
    else if (!temNoMaximoDuasCasas(b.descontoPercentual)) erros.push({ campo: 'descontoPercentual', mensagem: 'O desconto deve ter no máximo 2 casas decimais.' });
  }

  if (!TIPOS_RATEIO.includes(b.tipoRateio)) {
    erros.push({ campo: 'tipoRateio', mensagem: `O tipoRateio deve ser um de: ${TIPOS_RATEIO.join(', ')}.` });
  }

  if (b.pagoPorId !== undefined && b.pagoPorId !== null && !ehObjectId(b.pagoPorId)) {
    erros.push({ campo: 'pagoPorId', mensagem: 'pagoPorId deve ser um id de usuário válido.' });
  }

  if (b.data !== undefined && b.data !== null && Number.isNaN(Date.parse(b.data))) {
    erros.push({ campo: 'data', mensagem: 'A data deve estar no formato ISO 8601 (ex.: 2026-11-25).' });
  }

  if (b.tipoRateio === 'IGUALITARIO' && b.participantes !== undefined && b.participantes !== null) {
    if (!Array.isArray(b.participantes) || !b.participantes.every(ehObjectId)) {
      erros.push({ campo: 'participantes', mensagem: 'participantes deve ser um array de ids de usuário válidos.' });
    }
  }

  if (b.tipoRateio === 'PERCENTUAL' || b.tipoRateio === 'VALOR_EXATO') {
    const chave = b.tipoRateio === 'PERCENTUAL' ? 'percentual' : 'valor';
    if (!Array.isArray(b.divisoes) || b.divisoes.length === 0) {
      erros.push({ campo: 'divisoes', mensagem: `divisoes é obrigatório para ${b.tipoRateio}: array de { usuarioId, ${chave} }.` });
    } else {
      b.divisoes.forEach((d, i) => {
        if (!d || typeof d !== 'object') return erros.push({ campo: `divisoes[${i}]`, mensagem: 'Cada divisão deve ser um objeto.' });
        if (!ehObjectId(d.usuarioId)) erros.push({ campo: `divisoes[${i}].usuarioId`, mensagem: 'usuarioId inválido.' });
        if (!ehNumero(d[chave])) erros.push({ campo: `divisoes[${i}].${chave}`, mensagem: `${chave} deve ser numérico.` });
        return undefined;
      });
    }
  }

  lancarSeHouverErros(erros);
}

/** Regras de negócio do valor/desconto => 422 (ou 403 para desconto > 50% sem ser ADMIN). */
function validarValores(b, papelDoSolicitante) {
  if (b.valorTotal < VALOR_MINIMO || b.valorTotal > VALOR_MAXIMO) {
    throw AppError.regraNegocio(
      `O valor total deve estar entre R$ 0,01 e R$ 50.000,00. Valor recebido: ${b.valorTotal}.`,
      { minimo: VALOR_MINIMO, maximo: VALOR_MAXIMO, recebido: b.valorTotal },
      'VALOR_FORA_DO_LIMITE'
    );
  }

  const desconto = b.descontoPercentual ?? 0;
  if (desconto < DESCONTO_MINIMO || desconto > DESCONTO_MAXIMO) {
    throw AppError.regraNegocio(
      `O desconto deve estar entre ${DESCONTO_MINIMO}% e ${DESCONTO_MAXIMO}%.`,
      { minimo: DESCONTO_MINIMO, maximo: DESCONTO_MAXIMO, recebido: desconto },
      'DESCONTO_FORA_DO_LIMITE'
    );
  }
  if (desconto > DESCONTO_MAXIMO_MEMBRO && papelDoSolicitante !== PAPEIS.ADMIN) {
    throw new AppError(403, 'DESCONTO_REQUER_ADMIN', `Descontos acima de ${DESCONTO_MAXIMO_MEMBRO}% só podem ser lançados pelo ADMIN do grupo.`);
  }

  const valorLiquidoCentavos = aplicarDesconto(paraCentavos(b.valorTotal), desconto);
  if (valorLiquidoCentavos < 1) {
    throw AppError.regraNegocio('O valor líquido (após desconto) deve ser de no mínimo R$ 0,01.', undefined, 'VALOR_LIQUIDO_INVALIDO');
  }
  return { desconto, valorLiquidoCentavos };
}

/** Monta os campos persistidos de uma despesa a partir do corpo da requisição. */
function montarDespesa(body, grupo, membroSolicitante, usuario) {
  validarEstrutura(body);
  const { desconto, valorLiquidoCentavos } = validarValores(body, membroSolicitante.papel);
  const membrosIds = grupo.membros.map(grupoService.idDoMembro);

  const pagoPor = body.pagoPorId || usuario._id.toString();
  if (!membrosIds.includes(pagoPor)) {
    throw AppError.regraNegocio('Quem pagou a despesa (pagoPorId) deve ser membro do grupo.', { pagoPorId: pagoPor }, 'PAGADOR_NAO_MEMBRO');
  }

  const divisoes = calcularDivisoes({
    tipoRateio: body.tipoRateio,
    valorLiquidoCentavos,
    membrosIds,
    participantes: body.participantes,
    divisoes: body.divisoes,
  });

  return {
    descricao: body.descricao.trim(),
    valorTotalCentavos: paraCentavos(body.valorTotal),
    descontoPercentual: desconto,
    valorLiquidoCentavos,
    tipoRateio: body.tipoRateio,
    pagoPor,
    divisoes,
    data: body.data ? new Date(body.data) : new Date(),
  };
}

function exigirGrupoAberto(grupo, acao) {
  if (grupo.status === STATUS_GRUPO.FECHADO) {
    throw AppError.conflito(`Não é permitido ${acao} despesas em um grupo FECHADO.`, 'GRUPO_FECHADO');
  }
}

async function carregarDespesa(grupo, despesaId) {
  exigirIdValido(despesaId, 'Despesa');
  const despesa = await Despesa.findOne({ _id: despesaId, grupo: grupo._id });
  if (!despesa) throw AppError.naoEncontrado('Despesa não encontrada neste grupo.');
  return despesa;
}

/**
 * Ordem das verificações em edição/exclusão (documentada no README):
 * 404 grupo -> 403 não participante -> 404 despesa -> 409 grupo FECHADO -> 409 despesa QUITADA
 * -> 403 não é autor nem ADMIN -> 400/422/403 validação dos dados.
 */
function exigirPodeAlterar(grupo, despesa, membro, usuario, acao) {
  exigirGrupoAberto(grupo, acao);
  if (despesa.quitada) {
    throw AppError.conflito(`Despesa QUITADA não pode ser ${acao === 'editar' ? 'editada' : 'excluída'}.`, 'DESPESA_QUITADA');
  }
  const ehAutor = despesa.autor.toString() === usuario._id.toString();
  if (!ehAutor && membro.papel !== PAPEIS.ADMIN) {
    throw AppError.acessoNegado(`Apenas o autor da despesa ou o ADMIN do grupo pode ${acao} esta despesa.`);
  }
}

// ---------- casos de uso ----------

async function listar(usuario, grupoId) {
  const grupo = await grupoService.carregarGrupo(grupoId);
  grupoService.exigirMembro(grupo, usuario);
  const despesas = await Despesa.find({ grupo: grupo._id }).populate(POPULAR).sort({ data: -1, criadoEm: -1 });
  return despesas.map(formatarDespesa);
}

async function obter(usuario, grupoId, despesaId) {
  const grupo = await grupoService.carregarGrupo(grupoId);
  grupoService.exigirMembro(grupo, usuario);
  const despesa = await carregarDespesa(grupo, despesaId);
  await despesa.populate(POPULAR);
  return formatarDespesa(despesa);
}

async function criar(usuario, grupoId, body) {
  const grupo = await grupoService.carregarGrupo(grupoId);
  const membro = grupoService.exigirMembro(grupo, usuario);
  exigirGrupoAberto(grupo, 'criar');

  const dados = montarDespesa(body, grupo, membro, usuario);
  const despesa = await Despesa.create({ ...dados, grupo: grupo._id, autor: usuario._id });
  await despesa.populate(POPULAR);
  return formatarDespesa(despesa);
}

async function atualizar(usuario, grupoId, despesaId, body) {
  const grupo = await grupoService.carregarGrupo(grupoId);
  const membro = grupoService.exigirMembro(grupo, usuario);
  const despesa = await carregarDespesa(grupo, despesaId);
  exigirPodeAlterar(grupo, despesa, membro, usuario, 'editar');

  Object.assign(despesa, montarDespesa(body, grupo, membro, usuario));
  await despesa.save();
  await despesa.populate(POPULAR);
  return formatarDespesa(despesa);
}

async function excluir(usuario, grupoId, despesaId) {
  const grupo = await grupoService.carregarGrupo(grupoId);
  const membro = grupoService.exigirMembro(grupo, usuario);
  const despesa = await carregarDespesa(grupo, despesaId);
  exigirPodeAlterar(grupo, despesa, membro, usuario, 'excluir');
  await despesa.deleteOne();
}

/** Marca a despesa como QUITADA (acertada). Permitido também em grupo FECHADO. */
async function quitar(usuario, grupoId, despesaId) {
  const grupo = await grupoService.carregarGrupo(grupoId);
  const membro = grupoService.exigirMembro(grupo, usuario);
  const despesa = await carregarDespesa(grupo, despesaId);
  if (despesa.quitada) throw AppError.conflito('A despesa já está QUITADA.', 'DESPESA_JA_QUITADA');
  const ehAutor = despesa.autor.toString() === usuario._id.toString();
  if (!ehAutor && membro.papel !== PAPEIS.ADMIN) {
    throw AppError.acessoNegado('Apenas o autor da despesa ou o ADMIN do grupo pode quitá-la.');
  }
  despesa.quitada = true;
  despesa.quitadaEm = new Date();
  await despesa.save();
  await despesa.populate(POPULAR);
  return formatarDespesa(despesa);
}

async function balanco(usuario, grupoId) {
  const grupo = await grupoService.carregarGrupo(grupoId);
  grupoService.exigirMembro(grupo, usuario);
  const despesas = await Despesa.find({ grupo: grupo._id }).lean();

  const membros = grupo.membros.map((m) => ({
    id: grupoService.idDoMembro(m),
    nome: m.usuario.nome,
    email: m.usuario.email,
    papel: m.papel,
  }));
  const resultado = calcularBalanco(
    membros,
    despesas.map((d) => ({
      valorLiquidoCentavos: d.valorLiquidoCentavos,
      pagoPor: d.pagoPor.toString(),
      quitada: d.quitada,
      divisoes: d.divisoes.map((div) => ({ usuario: div.usuario.toString(), valorCentavos: div.valorCentavos })),
    }))
  );

  return { grupoId: grupo._id.toString(), grupoNome: grupo.nome, status: grupo.status, ...resultado };
}

module.exports = { listar, obter, criar, atualizar, excluir, quitar, balanco };
