'use strict';

const mongoose = require('mongoose');
const { PAPEIS, STATUS_GRUPO } = require('../utils/regras');

const membroSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    papel: { type: String, enum: Object.values(PAPEIS), required: true },
    adicionadoEm: { type: Date, default: Date.now },
  },
  { _id: false }
);

const grupoSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    descricao: { type: String, default: '', trim: true },
    status: { type: String, enum: Object.values(STATUS_GRUPO), default: STATUS_GRUPO.ABERTO },
    criadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    membros: { type: [membroSchema], default: [] },
    fechadoEm: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

grupoSchema.index({ 'membros.usuario': 1 });

grupoSchema.methods.buscarMembro = function buscarMembro(usuarioId) {
  const id = usuarioId.toString();
  return this.membros.find((m) => (m.usuario._id || m.usuario).toString() === id) || null;
};

module.exports = mongoose.model('Grupo', grupoSchema);
