export const REGRAS_SENHA = [
  { id: 'tamanho', texto: 'Mínimo de 8 caracteres', teste: (s) => s.length >= 8 },
  { id: 'maiuscula', texto: '1 letra maiúscula', teste: (s) => /[A-Z]/.test(s) },
  { id: 'numero', texto: '1 número', teste: (s) => /[0-9]/.test(s) },
  { id: 'especial', texto: '1 caractere especial', teste: (s) => /[^A-Za-z0-9]/.test(s) },
];

export const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
