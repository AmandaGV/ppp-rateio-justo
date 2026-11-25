'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let servidorMemoria = null;

/**
 * Sobe uma instância MongoDB 100% em memória (mongodb-memory-server)
 * e conecta o Mongoose nela. Os dados são perdidos ao encerrar o processo.
 *
 * Se a variável MONGODB_URI estiver definida, conecta nesse banco em vez do em memória
 * (útil para depuração; não é necessário para rodar a aplicação).
 */
async function conectar() {
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    servidorMemoria = await MongoMemoryServer.create();
    uri = servidorMemoria.getUri();
  }
  await mongoose.connect(uri, { dbName: 'rateiojusto' });
  return uri;
}

async function limpar() {
  const colecoes = await mongoose.connection.db.collections();
  await Promise.all(colecoes.map((c) => c.deleteMany({})));
}

async function desconectar() {
  await mongoose.disconnect();
  if (servidorMemoria) await servidorMemoria.stop();
}

module.exports = { conectar, limpar, desconectar };
