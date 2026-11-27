'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');
const AppError = require('../utils/AppError');
const Usuario = require('../models/Usuario');

/**
 * Exige header "Authorization: Bearer <token>".
 * 401 se ausente, malformado, inválido, expirado ou se o usuário não existir mais.
 */
async function autenticar(req, _res, next) {
  const header = req.headers.authorization || '';
  const [esquema, token] = header.split(' ');

  if (!header) throw AppError.naoAutenticado('Token de autenticação ausente. Envie o header Authorization: Bearer <token>.');
  if (esquema !== 'Bearer' || !token) throw AppError.naoAutenticado('Formato do token inválido. Use: Authorization: Bearer <token>.');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch (erro) {
    if (erro.name === 'TokenExpiredError') throw AppError.naoAutenticado('Token expirado. Faça login novamente.');
    throw AppError.naoAutenticado('Token inválido.');
  }

  const usuario = await Usuario.findById(payload.sub);
  if (!usuario) throw AppError.naoAutenticado('Usuário do token não existe mais.');

  req.usuario = usuario;
  next();
}

module.exports = autenticar;
