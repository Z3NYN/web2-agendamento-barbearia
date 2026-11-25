import type { Marca } from "../types/Barbearia";

export const CHAVE_ABERTURA = "studio-abertura-v4";

export function logoMarca(marca?: Marca | null): string | undefined {
  if (!marca?.logo) return undefined;
  if (marca.demonstracao && marca.logo === "/api/publico/logo?v=1") {
    return "/studio/marca.png";
  }
  return marca.logo;
}

export function normalizarCores(marca?: Marca | null): { fundo: string; destaque: string } {
  if (!marca) return { fundo: "#0E0E0F", destaque: "#D4B48C" };
  const f = marca.corFundo.toLowerCase();
  const d = marca.corDestaque.toLowerCase();
  const padraoLegado =
    (f === "#0d0d0d" && d === "#e6c89b") ||
    (f === "#121212" && d === "#d4bd98");
  if (padraoLegado) return { fundo: "#0E0E0F", destaque: "#D4B48C" };
  return { fundo: marca.corFundo || "#0E0E0F", destaque: marca.corDestaque || "#D4B48C" };
}
