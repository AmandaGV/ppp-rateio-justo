'use strict';

const grupoService = require('../services/grupoService');

module.exports = {
  async listar(req, res) {
    res.json(await grupoService.listar(req.usuario));
  },
  async criar(req, res) {
    res.status(201).json(await grupoService.criar(req.usuario, req.body));
  },
  async obter(req, res) {
    res.json(await grupoService.obter(req.usuario, req.params.id));
  },
  async excluir(req, res) {
    await grupoService.excluir(req.usuario, req.params.id);
    res.status(204).send();
  },
  async fechar(req, res) {
    res.json(await grupoService.fechar(req.usuario, req.params.id));
  },
  async listarMembros(req, res) {
    res.json(await grupoService.listarMembros(req.usuario, req.params.id));
  },
  async adicionarMembro(req, res) {
    res.status(201).json(await grupoService.adicionarMembro(req.usuario, req.params.id, req.body));
  },
  async removerMembro(req, res) {
    await grupoService.removerMembro(req.usuario, req.params.id, req.params.usuarioId);
    res.status(204).send();
  },
};
