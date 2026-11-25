'use strict';

/**
 * Erro de aplicação com status HTTP e código semântico.
 * Formato de resposta: { erro, mensagem, detalhes? }
 */
class AppError extends Error {
  constructor(status, erro, mensagem, detalhes) {
    super(mensagem);
    this.status = status;
    this.erro = erro;
    this.detalhes = detalhes;
  }

  static validacao(mensagem, detalhes) {
    return new AppError(400, 'VALIDACAO', mensagem, detalhes);
  }

  static naoAutenticado(mensagem = 'Token de autenticação ausente ou inválido.') {
    return new AppError(401, 'NAO_AUTENTICADO', mensagem);
  }

  static acessoNegado(mensagem) {
    return new AppError(403, 'ACESSO_NEGADO', mensagem);
  }

  static naoEncontrado(mensagem) {
    return new AppError(404, 'NAO_ENCONTRADO', mensagem);
  }

  static conflito(mensagem, erro = 'CONFLITO') {
    return new AppError(409, erro, mensagem);
  }

  static regraNegocio(mensagem, detalhes, erro = 'REGRA_DE_NEGOCIO') {
    return new AppError(422, erro, mensagem, detalhes);
  }
}

module.exports = AppError;
