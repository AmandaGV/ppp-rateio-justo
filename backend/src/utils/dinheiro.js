'use strict';

/**
 * Todos os cálculos monetários são feitos em CENTAVOS (inteiros)
 * para evitar erros de ponto flutuante. A API recebe e devolve reais (number com 2 casas).
 */

function temNoMaximoDuasCasas(numero) {
  return Math.abs(Math.round(numero * 100) - numero * 100) < 1e-6;
}

function paraCentavos(reais) {
  return Math.round(Number(reais) * 100);
}

function paraReais(centavos) {
  return Math.round(centavos) / 100;
}

/** Converte percentual (ex.: 33.33) em centésimos de ponto percentual (3333). */
function percentualParaInteiro(percentual) {
  return Math.round(Number(percentual) * 100);
}

/**
 * Aplica desconto percentual sobre um valor em centavos.
 * Arredondamento: meio para cima (half-up) no centavo.
 */
function aplicarDesconto(centavos, descontoPercentual) {
  const desconto = Math.round((centavos * percentualParaInteiro(descontoPercentual)) / 10000);
  return centavos - desconto;
}

module.exports = {
  temNoMaximoDuasCasas,
  paraCentavos,
  paraReais,
  percentualParaInteiro,
  aplicarDesconto,
};
