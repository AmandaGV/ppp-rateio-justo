'use strict';

/**
 * Regras puras de cálculo do rateio (sem acesso a banco).
 * Todos os valores monetários em CENTAVOS e percentuais em CENTÉSIMOS de ponto (100% = 10000).
 */

const AppError = require('../utils/AppError');
const { temNoMaximoDuasCasas, paraCentavos, paraReais, percentualParaInteiro } = require('../utils/dinheiro');

/** Distribui centavos restantes, 1 a 1, na ordem informada dos participantes. */
function distribuirResto(divisoes, totalCentavos) {
  let resto = totalCentavos - divisoes.reduce((s, d) => s + d.valorCentavos, 0);
  for (let i = 0; resto > 0; i = (i + 1) % divisoes.length) {
    divisoes[i].valorCentavos += 1;
    resto -= 1;
  }
  return divisoes;
}

function validarParticipantes(ids, membrosIds) {
  if (ids.length === 0) {
    throw AppError.regraNegocio('A despesa deve ter pelo menos 1 participante.', undefined, 'PARTICIPANTES_VAZIO');
  }
  const duplicados = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicados.length > 0) {
    throw AppError.regraNegocio('Há participantes repetidos no rateio.', { usuarioIds: [...new Set(duplicados)] }, 'PARTICIPANTE_DUPLICADO');
  }
  const naoMembros = ids.filter((id) => !membrosIds.includes(id));
  if (naoMembros.length > 0) {
    throw AppError.regraNegocio('Todos os participantes do rateio devem ser membros do grupo.', { usuarioIds: naoMembros }, 'PARTICIPANTE_NAO_MEMBRO');
  }
}

function ratearIgualitario(valorLiquidoCentavos, participantes) {
  const base = Math.floor(valorLiquidoCentavos / participantes.length);
  const divisoes = participantes.map((usuario) => ({ usuario, percentual: null, valorCentavos: base }));
  return distribuirResto(divisoes, valorLiquidoCentavos);
}

function ratearPercentual(valorLiquidoCentavos, divisoesEntrada) {
  const invalidos = divisoesEntrada.filter((d) => !(d.percentual > 0 && d.percentual <= 100) || !temNoMaximoDuasCasas(d.percentual));
  if (invalidos.length > 0) {
    throw AppError.regraNegocio(
      'Cada percentual deve ser maior que 0 e no máximo 100, com até 2 casas decimais.',
      { usuarioIds: invalidos.map((d) => d.usuarioId) },
      'PERCENTUAL_INVALIDO'
    );
  }

  const soma = divisoesEntrada.reduce((s, d) => s + percentualParaInteiro(d.percentual), 0);
  if (soma !== 10000) {
    throw AppError.regraNegocio(
      `A soma dos percentuais deve ser exatamente 100%. Soma recebida: ${soma / 100}%.`,
      { somaPercentuais: soma / 100, esperado: 100 },
      'SOMA_PERCENTUAIS_INVALIDA'
    );
  }

  const divisoes = divisoesEntrada.map((d) => ({
    usuario: d.usuarioId,
    percentual: percentualParaInteiro(d.percentual) / 100,
    valorCentavos: Math.floor((valorLiquidoCentavos * percentualParaInteiro(d.percentual)) / 10000),
  }));
  return distribuirResto(divisoes, valorLiquidoCentavos);
}

function ratearValorExato(valorLiquidoCentavos, divisoesEntrada) {
  const invalidos = divisoesEntrada.filter((d) => !(d.valor >= 0.01) || !temNoMaximoDuasCasas(d.valor));
  if (invalidos.length > 0) {
    throw AppError.regraNegocio(
      'Cada valor individual deve ser de no mínimo R$ 0,01, com até 2 casas decimais.',
      { usuarioIds: invalidos.map((d) => d.usuarioId) },
      'VALOR_INDIVIDUAL_INVALIDO'
    );
  }

  const soma = divisoesEntrada.reduce((s, d) => s + paraCentavos(d.valor), 0);
  if (soma !== valorLiquidoCentavos) {
    throw AppError.regraNegocio(
      `A soma dos valores individuais (R$ ${paraReais(soma).toFixed(2)}) deve ser igual ao valor líquido da despesa (R$ ${paraReais(valorLiquidoCentavos).toFixed(2)}).`,
      { somaValores: paraReais(soma), valorLiquido: paraReais(valorLiquidoCentavos) },
      'SOMA_VALORES_INVALIDA'
    );
  }

  return divisoesEntrada.map((d) => ({ usuario: d.usuarioId, percentual: null, valorCentavos: paraCentavos(d.valor) }));
}

/**
 * Calcula a divisão de uma despesa.
 * @param {object} p
 * @param {'IGUALITARIO'|'PERCENTUAL'|'VALOR_EXATO'} p.tipoRateio
 * @param {number} p.valorLiquidoCentavos
 * @param {string[]} p.membrosIds ids dos membros do grupo
 * @param {string[]} [p.participantes] IGUALITARIO: ids selecionados (padrão: todos os membros)
 * @param {Array<{usuarioId:string, percentual?:number, valor?:number}>} [p.divisoes] PERCENTUAL / VALOR_EXATO
 * @returns {Array<{usuario:string, percentual:number|null, valorCentavos:number}>}
 */
function calcularDivisoes({ tipoRateio, valorLiquidoCentavos, membrosIds, participantes, divisoes }) {
  if (tipoRateio === 'IGUALITARIO') {
    const ids = Array.isArray(participantes) ? participantes : membrosIds;
    validarParticipantes(ids, membrosIds);
    return ratearIgualitario(valorLiquidoCentavos, ids);
  }

  validarParticipantes(divisoes.map((d) => d.usuarioId), membrosIds);
  if (tipoRateio === 'PERCENTUAL') return ratearPercentual(valorLiquidoCentavos, divisoes);
  return ratearValorExato(valorLiquidoCentavos, divisoes);
}

module.exports = { calcularDivisoes };
