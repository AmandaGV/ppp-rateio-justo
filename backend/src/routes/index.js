'use strict';

const { Router } = require('express');
const config = require('../config');
const autenticar = require('../middlewares/autenticacao');
const auth = require('../controllers/authController');
const grupos = require('../controllers/grupoController');
const despesas = require('../controllers/despesaController');
const { limpar } = require('../database/connection');
const { popular } = require('../database/seed');

const router = Router();

// Saúde (sem autenticação) — útil para health-check em testes de performance
router.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Autenticação
router.post('/auth/register', auth.registrar);
router.post('/auth/login', auth.login);
router.get('/auth/me', autenticar, auth.eu);

// Grupos (todas exigem token)
router.get('/grupos', autenticar, grupos.listar);
router.post('/grupos', autenticar, grupos.criar);
router.get('/grupos/:id', autenticar, grupos.obter);
router.delete('/grupos/:id', autenticar, grupos.excluir);
router.patch('/grupos/:id/fechar', autenticar, grupos.fechar);

// Membros
router.get('/grupos/:id/membros', autenticar, grupos.listarMembros);
router.post('/grupos/:id/membros', autenticar, grupos.adicionarMembro);
router.delete('/grupos/:id/membros/:usuarioId', autenticar, grupos.removerMembro);

// Despesas
router.get('/grupos/:id/despesas', autenticar, despesas.listar);
router.post('/grupos/:id/despesas', autenticar, despesas.criar);
router.get('/grupos/:id/despesas/:despesaId', autenticar, despesas.obter);
router.put('/grupos/:id/despesas/:despesaId', autenticar, despesas.atualizar);
router.delete('/grupos/:id/despesas/:despesaId', autenticar, despesas.excluir);
router.patch('/grupos/:id/despesas/:despesaId/quitar', autenticar, despesas.quitar);

// Balanço / acerto de contas
router.get('/grupos/:id/balanco', autenticar, despesas.balanco);

// Utilitário para automação de testes: restaura o banco para os dados de seed
if (config.enableTestRoutes) {
  router.post('/test/reset', async (_req, res) => {
    await limpar();
    const resumo = await popular();
    res.json({ mensagem: 'Banco restaurado para os dados de seed.', ...resumo });
  });
}

module.exports = router;
