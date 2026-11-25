// src/services/auth.ts
const TOKEN = "token";
const USUARIO = "usuario";

export interface Sessao {
  token: string;
  nome: string;
  permissoes: string[];
}

export function salvarSessao(sessao: Sessao) {
  sessionStorage.setItem(TOKEN, sessao.token);
  sessionStorage.setItem(USUARIO, JSON.stringify(sessao));
}

export function obterToken(): string | null {
  return sessionStorage.getItem(TOKEN);
}

export function obterSessao(): Sessao | null {
  const usuario = sessionStorage.getItem(USUARIO);
  if (!usuario) return null;

  try {
    return JSON.parse(usuario) as Sessao;
  } catch {
    return null;
  }
}

export function temPapel(papel: string): boolean {
  const sessao = obterSessao();
  return sessao ? sessao.permissoes.includes(papel) : false;
}

export function sair() {
  sessionStorage.removeItem(TOKEN);
  sessionStorage.removeItem(USUARIO);
}
