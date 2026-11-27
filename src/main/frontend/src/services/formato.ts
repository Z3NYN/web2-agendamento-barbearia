import axios from "axios";

export function mensagem(erro: unknown): string {
  if (axios.isAxiosError<{ erro?: string }>(erro)) {
    return erro.response?.data?.erro ?? (erro.response?.status === 403
      ? "Você não tem permissão para esta operação."
      : "Não foi possível completar a operação. Tente novamente.");
  }
  return "Não foi possível completar a operação.";
}

export const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format;
const dataBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "medium" });
const dataCurtaBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "short", day: "2-digit", month: "short" });
const diaSp = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const ISO_DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function hoje(): string {
  const partes = Object.fromEntries(diaSp.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}

export function dataIsoValida(valor: string | null | undefined, padrao?: string): string {
  const fallback = padrao ?? hoje();
  if (!valor || !ISO_DIA_RE.test(valor)) return fallback;
  const parsed = new Date(valor + "T12:00:00Z");
  if (!Number.isFinite(parsed.getTime())) return fallback;
  return parsed.toISOString().slice(0, 10) === valor ? valor : fallback;
}

export const hora = (valor: string) => valor.slice(11, 16);
export const data = (valor: string) => dataBr.format(new Date(dataIsoValida(valor.slice(0, 10)) + "T15:00:00Z"));
export const dataCurta = (valor: string) => dataCurtaBr.format(new Date(dataIsoValida(valor.slice(0, 10)) + "T15:00:00Z")).replace(".", "");
export const dataHora = (valor: string) => `${data(valor)} às ${hora(valor)}`;
export const dataHoraCurta = (valor: string) => {
  const dia = valor.slice(0, 10);
  return `${dia === hoje() ? "Hoje" : dataCurta(valor)} · ${hora(valor)}`;
};
export const instanteAgenda = (valor: string) => new Date(valor + "-03:00").getTime();

export function compararInicioAsc<T extends { id: number; inicio: string }>(a: T, b: T): number {
  const diff = instanteAgenda(a.inicio) - instanteAgenda(b.inicio);
  return diff !== 0 ? diff : a.id - b.id;
}

export function compararInicioDesc<T extends { id: number; inicio: string }>(a: T, b: T): number {
  const diff = instanteAgenda(b.inicio) - instanteAgenda(a.inicio);
  return diff !== 0 ? diff : b.id - a.id;
}

export function extrairSujeitoToken(token: string | null | undefined): string | null {
  if (!token) return null;
  try {
    const partes = token.split(".");
    if (partes.length < 2) return null;
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
    const payload = JSON.parse(json) as { sub?: unknown };
    return typeof payload.sub === "string" && payload.sub.trim() ? payload.sub.trim() : null;
  } catch {
    return null;
  }
}

export function iniciais(nome?: string | null): string {
  if (!nome) return "SC";
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export const statusTexto = {
  RESERVADO: "Reservado",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
  FALTOU: "Falta",
};
