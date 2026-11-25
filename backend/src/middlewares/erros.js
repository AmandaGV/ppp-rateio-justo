'use strict';

const AppError = require('../utils/AppError');

function rotaNaoEncontrada(req, _res, next) {
  next(AppError.naoEncontrado(`Rota ${req.method} ${req.originalUrl} não encontrada.`));
}

// eslint-disable-next-line no-unused-vars
function tratarErros(err, _req, res, _next) {
  if (err instanceof AppError) {
    const corpo = { erro: err.erro, mensagem: err.message };
    if (err.detalhes) corpo.detalhes = err.detalhes;
    return res.status(err.status).json(corpo);
  }

  // JSON malformado no corpo da requisição
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON_INVALIDO', mensagem: 'O corpo da requisição não é um JSON válido.' });
  }

  // Violação de índice único (ex.: e-mail duplicado em corrida)
  if (err.code === 11000) {
    return res.status(409).json({ erro: 'CONFLITO', mensagem: 'Registro duplicado.' });
  }

  console.error('[erro não tratado]', err);
  return res.status(500).json({ erro: 'ERRO_INTERNO', mensagem: 'Erro interno do servidor.' });
}

module.exports = { rotaNaoEncontrada, tratarErros };
