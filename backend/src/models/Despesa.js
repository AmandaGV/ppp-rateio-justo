'use strict';

const mongoose = require('mongoose');
const { TIPOS_RATEIO } = require('../utils/regras');

const divisaoSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    percentual: { type: Number, default: null },
    valorCentavos: { type: Number, required: true },
  },
  { _id: false }
);

const despesaSchema = new mongoose.Schema(
  {
    grupo: { type: mongoose.Schema.Types.ObjectId, ref: 'Grupo', required: true, index: true },
    descricao: { type: String, required: true, trim: true },
    valorTotalCentavos: { type: Number, required: true },
    descontoPercentual: { type: Number, default: 0 },
    valorLiquidoCentavos: { type: Number, required: true },
    tipoRateio: { type: String, enum: TIPOS_RATEIO, required: true },
    autor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    pagoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    divisoes: { type: [divisaoSchema], default: [] },
    data: { type: Date, default: Date.now },
    quitada: { type: Boolean, default: false },
    quitadaEm: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'criadoEm', updatedAt: 'atualizadoEm' } }
);

module.exports = mongoose.model('Despesa', despesaSchema);
