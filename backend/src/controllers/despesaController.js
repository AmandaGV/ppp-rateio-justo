'use strict';

const despesaService = require('../services/despesaService');

module.exports = {
  async listar(req, res) {
    res.json(await despesaService.listar(req.usuario, req.params.id));
  },
  async obter(req, res) {
    res.json(await despesaService.obter(req.usuario, req.params.id, req.params.despesaId));
  },
  async criar(req, res) {
    res.status(201).json(await despesaService.criar(req.usuario, req.params.id, req.body));
  },
  async atualizar(req, res) {
    res.json(await despesaService.atualizar(req.usuario, req.params.id, req.params.despesaId, req.body));
  },
  async excluir(req, res) {
    await despesaService.excluir(req.usuario, req.params.id, req.params.despesaId);
    res.status(204).send();
  },
  async quitar(req, res) {
    res.json(await despesaService.quitar(req.usuario, req.params.id, req.params.despesaId));
  },
  async balanco(req, res) {
    res.json(await despesaService.balanco(req.usuario, req.params.id));
  },
};
