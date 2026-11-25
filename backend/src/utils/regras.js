'use strict';

/**
 * Constantes das regras de negócio do RateioJusto.
 * Centralizadas aqui para que API, documentação e testes usem os mesmos limites.
 */
module.exports = Object.freeze({
  MIN_PARTICIPANTES: 1,
  MAX_PARTICIPANTES: 20,
  VALOR_MINIMO: 0.01,
  VALOR_MAXIMO: 50000,
  DESCONTO_MINIMO: 0,
  DESCONTO_MAXIMO: 100,
  DESCONTO_MAXIMO_MEMBRO: 50,
  SENHA_MIN_CARACTERES: 8,
  NOME_MAX_CARACTERES: 100,
  DESCRICAO_MAX_CARACTERES: 200,
  PAPEIS: Object.freeze({ ADMIN: 'ADMIN', MEMBRO: 'MEMBRO' }),
  STATUS_GRUPO: Object.freeze({ ABERTO: 'ABERTO', FECHADO: 'FECHADO' }),
  TIPOS_RATEIO: Object.freeze(['IGUALITARIO', 'PERCENTUAL', 'VALOR_EXATO']),
});
