'use strict';

const authService = require('../services/authService');

module.exports = {
  async registrar(req, res) {
    res.status(201).json(await authService.registrar(req.body));
  },
  async login(req, res) {
    res.status(200).json(await authService.login(req.body));
  },
  async eu(req, res) {
    res.status(200).json(req.usuario.toPublico());
  },
};
