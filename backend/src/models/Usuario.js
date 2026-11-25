'use strict';

const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    senhaHash: { type: String, required: true },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

usuarioSchema.methods.toPublico = function toPublico() {
  return { id: this._id.toString(), nome: this.nome, email: this.email, criadoEm: this.criadoEm };
};

module.exports = mongoose.model('Usuario', usuarioSchema);
