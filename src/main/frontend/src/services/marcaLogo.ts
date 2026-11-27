import type { Marca } from "../types/Barbearia";
import { COR_DESTAQUE_PADRAO, COR_FUNDO_PADRAO, ehTemaPadrao, validarCorDestaque, validarCorFundo } from "../theme/themeEngine";

export const CHAVE_ABERTURA = "studio-abertura-v6";
export const LOGO_OFICIAL = "/studio/marca.png";

// O backend decide se o logotipo ativo corresponde ao wordmark oficial ou a um upload próprio.
export function logoMarca(marca?: Marca | null): string | undefined {
  return marca?.logo ?? undefined;
}

export function ehWordmarkOficial(logoUrl?: string): boolean {
  return logoUrl?.split("?")[0] === LOGO_OFICIAL;
}

export function normalizarCores(marca?: Marca | null): { fundo: string; destaque: string } {
  if (!marca) return { fundo: COR_FUNDO_PADRAO, destaque: COR_DESTAQUE_PADRAO };
  if (ehTemaPadrao(marca.corFundo, marca.corDestaque)) {
    return { fundo: COR_FUNDO_PADRAO, destaque: COR_DESTAQUE_PADRAO };
  }
  const f = validarCorFundo(marca.corFundo);
  const d = validarCorDestaque(marca.corDestaque);
  return {
    fundo: f.valida && f.hex ? f.hex : COR_FUNDO_PADRAO,
    destaque: d.valida && d.hex ? d.hex : COR_DESTAQUE_PADRAO,
  };
}
