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

export function hoje() {
  const partes = Object.fromEntries(diaSp.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return `${partes.year}-${partes.month}-${partes.day}`;
}

export const hora = (valor: string) => valor.slice(11, 16);
export const data = (valor: string) => dataBr.format(new Date(valor.slice(0, 10) + "T15:00:00Z"));
export const dataCurta = (valor: string) => dataCurtaBr.format(new Date(valor.slice(0, 10) + "T15:00:00Z")).replace(".", "");
export const dataHora = (valor: string) => `${data(valor)} às ${hora(valor)}`;
export const instanteAgenda = (valor: string) => new Date(valor + "-03:00").getTime();

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
