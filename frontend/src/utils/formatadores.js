const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarMoeda = (valor) => moeda.format(Number(valor) || 0);

export const formatarData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-');

/** Converte texto digitado ("1.234,56" ou "1234.56") em número. Retorna NaN se inválido. */
export function lerNumero(texto) {
  if (texto === '' || texto === null || texto === undefined) return NaN;
  let s = String(texto).trim().replace(/\s/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

export const paraCentavos = (n) => Math.round(n * 100);
