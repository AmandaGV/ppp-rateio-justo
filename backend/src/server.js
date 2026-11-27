'use strict';

const app = require('./app');
const config = require('./config');
const { conectar, desconectar } = require('./database/connection');
const { popular } = require('./database/seed');

async function iniciar() {
  console.log('[RateioJusto] Iniciando MongoDB em memória (o primeiro start pode baixar o binário do MongoDB)...');
  await conectar();
  const resumo = await popular();
  console.log(`[RateioJusto] Seed carregado: ${resumo.usuarios} usuários, ${resumo.grupos} grupos, ${resumo.despesas} despesas.`);

  const servidor = app.listen(config.port, () => {
    console.log(`[RateioJusto] API:     http://localhost:${config.port}/api`);
    console.log(`[RateioJusto] Swagger: http://localhost:${config.port}/api-docs`);
  });

  const encerrar = async () => {
    servidor.close();
    await desconectar();
    process.exit(0);
  };
  process.on('SIGINT', encerrar);
  process.on('SIGTERM', encerrar);
}

iniciar().catch((erro) => {
  console.error('[RateioJusto] Falha ao iniciar:', erro);
  process.exit(1);
});
