'use strict';

/**
 * Cálculo puro do balanço do grupo (sem acesso a banco).
 * Valores internos em centavos; a saída é em reais.
 */

const { paraReais } = require('../utils/dinheiro');

/**
 * Gera a lista mínima (gulosa) de transferências para zerar os saldos:
 * o maior devedor paga ao maior credor, repetidamente.
 * Desempate determinístico por nome e depois por id.
 */
function simplificarTransferencias(saldos) {
  const ordenar = (a, b) => b.restante - a.restante || a.nome.localeCompare(b.nome) || a.id.localeCompare(b.id);
  const credores = saldos.filter((s) => s.saldoCentavos > 0).map((s) => ({ ...s, restante: s.saldoCentavos }));
  const devedores = saldos.filter((s) => s.saldoCentavos < 0).map((s) => ({ ...s, restante: -s.saldoCentavos }));
  const transferencias = [];

  while (credores.length > 0 && devedores.length > 0) {
    credores.sort(ordenar);
    devedores.sort(ordenar);
    const credor = credores[0];
    const devedor = devedores[0];
    const valor = Math.min(credor.restante, devedor.restante);

    transferencias.push({
      deUsuarioId: devedor.id,
      deNome: devedor.nome,
      paraUsuarioId: credor.id,
      paraNome: credor.nome,
      valor: paraReais(valor),
    });

    credor.restante -= valor;
    devedor.restante -= valor;
    if (credor.restante === 0) credores.shift();
    if (devedor.restante === 0) devedores.shift();
  }

  return transferencias;
}

/**
 * @param {Array<{id:string, nome:string, email:string, papel:string}>} membros
 * @param {Array<{valorLiquidoCentavos:number, pagoPor:string, quitada:boolean, divisoes:Array<{usuario:string, valorCentavos:number}>}>} despesas
 */
function calcularBalanco(membros, despesas) {
  const porId = new Map(
    membros.map((m) => [m.id, { ...m, pagoCentavos: 0, devidoCentavos: 0 }])
  );
  const garantir = (id) => {
    if (!porId.has(id)) porId.set(id, { id, nome: '(ex-membro)', email: null, papel: null, pagoCentavos: 0, devidoCentavos: 0 });
    return porId.get(id);
  };

  let totalCentavos = 0;
  let pendenteCentavos = 0;
  let quantidadePendentes = 0;

  for (const d of despesas) {
    totalCentavos += d.valorLiquidoCentavos;
    if (d.quitada) continue; // despesas quitadas já foram acertadas e não geram saldo
    pendenteCentavos += d.valorLiquidoCentavos;
    quantidadePendentes += 1;
    garantir(d.pagoPor).pagoCentavos += d.valorLiquidoCentavos;
    for (const div of d.divisoes) garantir(div.usuario).devidoCentavos += div.valorCentavos;
  }

  const linhas = [...porId.values()].map((m) => ({ ...m, saldoCentavos: m.pagoCentavos - m.devidoCentavos }));

  return {
    totalGasto: paraReais(totalCentavos),
    totalPendente: paraReais(pendenteCentavos),
    totalQuitado: paraReais(totalCentavos - pendenteCentavos),
    quantidadeDespesas: despesas.length,
    quantidadeDespesasPendentes: quantidadePendentes,
    membros: linhas.map((m) => ({
      usuarioId: m.id,
      nome: m.nome,
      email: m.email,
      papel: m.papel,
      totalPago: paraReais(m.pagoCentavos),
      totalDevido: paraReais(m.devidoCentavos),
      saldo: paraReais(m.saldoCentavos),
      situacao: m.saldoCentavos > 0 ? 'A_RECEBER' : m.saldoCentavos < 0 ? 'A_PAGAR' : 'QUITE',
    })),
    transferencias: simplificarTransferencias(linhas),
  };
}

module.exports = { calcularBalanco, simplificarTransferencias };
