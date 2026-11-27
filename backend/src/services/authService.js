'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const { NOME_MAX_CARACTERES } = require('../utils/regras');
const { ehTextoPreenchido, validarEmail, validarSenha, lancarSeHouverErros } = require('../utils/validacao');

async function registrar({ nome, email, senha } = {}) {
  const erros = [];
  if (!ehTextoPreenchido(nome)) erros.push({ campo: 'nome', mensagem: 'O nome é obrigatório.' });
  else if (nome.trim().length > NOME_MAX_CARACTERES) erros.push({ campo: 'nome', mensagem: `O nome deve ter no máximo ${NOME_MAX_CARACTERES} caracteres.` });

  if (!ehTextoPreenchido(email)) erros.push({ campo: 'email', mensagem: 'O e-mail é obrigatório.' });
  else if (!validarEmail(email)) erros.push({ campo: 'email', mensagem: 'O e-mail informado não tem um formato válido.' });

  if (senha === undefined || senha === null || senha === '') erros.push({ campo: 'senha', mensagem: 'A senha é obrigatória.' });
  else validarSenha(senha).forEach((mensagem) => erros.push({ campo: 'senha', mensagem }));

  lancarSeHouverErros(erros);

  const emailNormalizado = email.trim().toLowerCase();
  if (await Usuario.exists({ email: emailNormalizado })) {
    throw AppError.conflito('Já existe um usuário cadastrado com este e-mail.', 'EMAIL_JA_CADASTRADO');
  }

  const senhaHash = await bcrypt.hash(senha, config.bcryptRounds);
  const usuario = await Usuario.create({ nome: nome.trim(), email: emailNormalizado, senhaHash });
  return usuario.toPublico();
}

async function login({ email, senha } = {}) {
  const erros = [];
  if (!ehTextoPreenchido(email)) erros.push({ campo: 'email', mensagem: 'O e-mail é obrigatório.' });
  if (typeof senha !== 'string' || senha.length === 0) erros.push({ campo: 'senha', mensagem: 'A senha é obrigatória.' });
  lancarSeHouverErros(erros);

  const usuario = await Usuario.findOne({ email: email.trim().toLowerCase() });
  const senhaConfere = usuario ? await bcrypt.compare(senha, usuario.senhaHash) : false;
  if (!senhaConfere) throw AppError.naoAutenticado('E-mail ou senha inválidos.');

  const token = jwt.sign({ sub: usuario._id.toString(), email: usuario.email }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  const { exp, iat } = jwt.decode(token);

  return {
    token,
    tipo: 'Bearer',
    expiraEm: new Date(exp * 1000).toISOString(),
    expiresIn: exp - iat,
    usuario: usuario.toPublico(),
  };
}

module.exports = { registrar, login };
