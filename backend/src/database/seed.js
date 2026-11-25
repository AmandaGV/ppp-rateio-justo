'use strict';

/**
 * Dados de teste carregados automaticamente a cada start da API
 * (e a cada chamada de POST /api/test/reset).
 *
 * Os IDs são FIXOS para facilitar a automação de testes:
 *   usuários  -> 6500000000000000000000XX
 *   grupos    -> 6600000000000000000000XX
 *   despesas  -> 6700000000000000000000XX
 *
 * Senha de TODOS os usuários de seed: Senha@123
 */

const bcrypt = require('bcrypt');
const config = require('../config');
const Usuario = require('../models/Usuario');
const Grupo = require('../models/Grupo');
const Despesa = require('../models/Despesa');
const { calcularDivisoes } = require('../services/rateioService');
const { paraCentavos, aplicarDesconto } = require('../utils/dinheiro');

const SENHA_PADRAO = 'Senha@123';
const id = (prefixo, n) => `${prefixo}${String(n).padStart(24 - prefixo.length, '0')}`;
const uid = (n) => id('65', n);
const gid = (n) => id('66', n);
const did = (n) => id('67', n);

const USUARIOS = [
  { _id: uid(1), nome: 'Ana Souza', email: 'ana@rateiojusto.com' },
  { _id: uid(2), nome: 'Bruno Lima', email: 'bruno@rateiojusto.com' },
  { _id: uid(3), nome: 'Carla Mendes', email: 'carla@rateiojusto.com' },
  { _id: uid(4), nome: 'Diego Rocha', email: 'diego@rateiojusto.com' },
  { _id: uid(5), nome: 'Eva Martins', email: 'eva@rateiojusto.com' },
  ...Array.from({ length: 19 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0');
    return { _id: uid(100 + i + 1), nome: `Membro ${n}`, email: `membro${n}@rateiojusto.com` };
  }),
];

const [ANA, BRUNO, CARLA, DIEGO] = USUARIOS.map((u) => u._id);
const MEMBROS_LOTADO = USUARIOS.filter((u) => u.email.startsWith('membro')).map((u) => u._id);

const membro = (usuario, papel = 'MEMBRO') => ({ usuario, papel });

const GRUPOS = [
  {
    _id: gid(1), nome: 'Viagem Floripa 2026', descricao: 'Viagem de fim de semana para Florianópolis',
    status: 'ABERTO', criadoPor: ANA,
    membros: [membro(ANA, 'ADMIN'), membro(BRUNO), membro(CARLA)],
  },
  {
    _id: gid(2), nome: 'República Centro', descricao: 'Contas mensais da república',
    status: 'ABERTO', criadoPor: BRUNO,
    membros: [membro(BRUNO, 'ADMIN'), membro(ANA), membro(DIEGO)],
  },
  {
    _id: gid(3), nome: 'Festa de Fim de Ano', descricao: 'Confraternização já encerrada',
    status: 'FECHADO', criadoPor: ANA, fechadoEm: new Date('2026-01-05T12:00:00Z'),
    membros: [membro(ANA, 'ADMIN'), membro(CARLA), membro(DIEGO)],
  },
  {
    _id: gid(4), nome: 'Grupo Lotado', descricao: 'Grupo com 20 participantes (limite máximo)',
    status: 'ABERTO', criadoPor: ANA,
    membros: [membro(ANA, 'ADMIN'), ...MEMBROS_LOTADO.map((u) => membro(u))],
  },
  {
    _id: gid(5), nome: 'Churrasco do Diego', descricao: 'Grupo com apenas 1 participante (limite mínimo)',
    status: 'ABERTO', criadoPor: DIEGO,
    membros: [membro(DIEGO, 'ADMIN')],
  },
];

const DESPESAS = [
  { _id: did(1), grupo: gid(1), descricao: 'Hospedagem', valorTotal: 1200, tipoRateio: 'IGUALITARIO', autor: ANA, pagoPor: ANA, data: '2026-10-10' },
  {
    _id: did(2), grupo: gid(1), descricao: 'Combustível', valorTotal: 300, tipoRateio: 'PERCENTUAL', autor: BRUNO, pagoPor: BRUNO, data: '2026-10-10',
    divisoes: [{ usuarioId: ANA, percentual: 50 }, { usuarioId: BRUNO, percentual: 30 }, { usuarioId: CARLA, percentual: 20 }],
  },
  {
    _id: did(3), grupo: gid(1), descricao: 'Jantar de sábado', valorTotal: 250, descontoPercentual: 10, tipoRateio: 'VALOR_EXATO', autor: CARLA, pagoPor: CARLA, data: '2026-10-11',
    divisoes: [{ usuarioId: ANA, valor: 100 }, { usuarioId: BRUNO, valor: 75 }, { usuarioId: CARLA, valor: 50 }],
  },
  { _id: did(4), grupo: gid(1), descricao: 'Passeio de barco', valorTotal: 180, tipoRateio: 'IGUALITARIO', autor: BRUNO, pagoPor: BRUNO, data: '2026-10-12', quitada: true },
  { _id: did(5), grupo: gid(2), descricao: 'Aluguel de novembro', valorTotal: 2400, tipoRateio: 'IGUALITARIO', autor: BRUNO, pagoPor: BRUNO, data: '2026-11-05' },
  { _id: did(6), grupo: gid(2), descricao: 'Internet', valorTotal: 100, tipoRateio: 'IGUALITARIO', autor: DIEGO, pagoPor: DIEGO, data: '2026-11-07' },
  { _id: did(7), grupo: gid(3), descricao: 'Buffet', valorTotal: 900, tipoRateio: 'IGUALITARIO', autor: ANA, pagoPor: ANA, data: '2025-12-20' },
];

function montarDespesa(d) {
  const grupo = GRUPOS.find((g) => g._id === d.grupo);
  const membrosIds = grupo.membros.map((m) => m.usuario);
  const desconto = d.descontoPercentual || 0;
  const valorLiquidoCentavos = aplicarDesconto(paraCentavos(d.valorTotal), desconto);
  return {
    _id: d._id,
    grupo: d.grupo,
    descricao: d.descricao,
    valorTotalCentavos: paraCentavos(d.valorTotal),
    descontoPercentual: desconto,
    valorLiquidoCentavos,
    tipoRateio: d.tipoRateio,
    autor: d.autor,
    pagoPor: d.pagoPor,
    divisoes: calcularDivisoes({ tipoRateio: d.tipoRateio, valorLiquidoCentavos, membrosIds, divisoes: d.divisoes }),
    data: new Date(d.data),
    quitada: Boolean(d.quitada),
    quitadaEm: d.quitada ? new Date(d.data) : null,
  };
}

async function popular() {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, config.bcryptRounds);
  await Usuario.insertMany(USUARIOS.map((u) => ({ ...u, senhaHash })));
  await Grupo.insertMany(GRUPOS);
  await Despesa.insertMany(DESPESAS.map(montarDespesa));
  return { usuarios: USUARIOS.length, grupos: GRUPOS.length, despesas: DESPESAS.length };
}

module.exports = { popular, SENHA_PADRAO, USUARIOS, GRUPOS, DESPESAS };
