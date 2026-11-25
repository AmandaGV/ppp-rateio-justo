'use strict';

const mongoose = require('mongoose');
const AppError = require('./AppError');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SENHA_REGRAS = [
  { teste: (s) => s.length >= 8, mensagem: 'A senha deve ter no mínimo 8 caracteres.' },
  { teste: (s) => /[A-Z]/.test(s), mensagem: 'A senha deve conter pelo menos 1 letra maiúscula.' },
  { teste: (s) => /[0-9]/.test(s), mensagem: 'A senha deve conter pelo menos 1 número.' },
  { teste: (s) => /[^A-Za-z0-9]/.test(s), mensagem: 'A senha deve conter pelo menos 1 caractere especial.' },
];

function ehTextoPreenchido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function ehNumero(valor) {
  return typeof valor === 'number' && Number.isFinite(valor);
}

function ehObjectId(valor) {
  return typeof valor === 'string' && mongoose.Types.ObjectId.isValid(valor) && /^[a-f0-9]{24}$/i.test(valor);
}

function validarEmail(email) {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function validarSenha(senha) {
  if (typeof senha !== 'string') return ['A senha é obrigatória.'];
  return SENHA_REGRAS.filter((r) => !r.teste(senha)).map((r) => r.mensagem);
}

/** Lança 400 se a lista de erros de campo não estiver vazia. */
function lancarSeHouverErros(erros, mensagem = 'Dados inválidos. Verifique os campos informados.') {
  if (erros.length > 0) throw AppError.validacao(mensagem, erros);
}

/** Garante que um parâmetro de rota seja um ObjectId; senão 404 (recurso inexistente). */
function exigirIdValido(id, recurso) {
  if (!ehObjectId(id)) throw AppError.naoEncontrado(`${recurso} não encontrado(a).`);
}

module.exports = {
  EMAIL_REGEX,
  ehTextoPreenchido,
  ehNumero,
  ehObjectId,
  validarEmail,
  validarSenha,
  lancarSeHouverErros,
  exigirIdValido,
};
