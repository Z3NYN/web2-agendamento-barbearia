export const COR_FUNDO_PADRAO = "#111111";
export const COR_DESTAQUE_PADRAO = "#C5B59B";
export const BOTAO_PRIMARIO_PADRAO = "#EAE3D8";
export const LUMINANCIA_MAXIMA_FUNDO = 0.085;

const TEXT_PRIMARY_HEX = "#FAFAF8";
const DARK_INK_HEX = "#0E0E10";
const LIGHT_INK_HEX = "#FFFFFF";

interface Rgb {
  r: number;
  g: number;
  b: number;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

export interface ValidacaoCor {
  valida: boolean;
  hex?: string;
  luminancia?: number;
  contrasteTexto?: number;
  erro?: string;
}

export interface TemaDerivado {
  fundo: string;
  destaque: string;
  ehPadrao: boolean;
  usouFallbackFundo: boolean;
  usouFallbackDestaque: boolean;
  cssVars: Record<string, string>;
  metricas: {
    contrasteFundoTexto: number;
    contrasteBotaoPrimario: number;
    contrasteDestaqueTexto: number;
    ajustouDestaqueParaContraste: boolean;
  };
}

const TOKENS_PADRAO: Record<string, string> = {
  "--bg-canvas": "#111111",
  "--bg-surface": "#171717",
  "--bg-surface-2": "#1F1F21",
  "--bg-surface-3": "#28282B",
  "--bg-surface-elevated": "#171614",
  "--bg-glass": "rgba(17, 17, 17, 0.96)",
  "--bg-backdrop": "rgba(6, 6, 7, 0.76)",
  "--bg-panel-tint": "rgba(26, 26, 26, 0.48)",
  "--bg-shimmer": "#2E2D29",
  "--bg-scrim-rgb": "17, 17, 17",

  "--text-primary": "#FAFAF8",
  "--text-secondary": "#B2AFA8",
  "--text-muted": "#8C8881",
  "--text-on-accent": "#111111",
  "--text-on-accent-muted": "rgba(17, 17, 17, 0.72)",

  "--accent": "#C5B59B",
  "--accent-primary": "#EAE3D8",
  "--accent-sand": "#EAE3D8",
  "--accent-text": "#EAE3D8",
  "--accent-hover": "#F4EFE6",
  "--accent-pressed": "#B5A386",
  "--accent-soft": "rgba(197, 181, 155, 0.12)",
  "--accent-soft-subtle": "rgba(197, 181, 155, 0.07)",
  "--accent-border": "rgba(197, 181, 155, 0.34)",
  "--accent-ring": "rgba(234, 227, 216, 0.55)",
  "--focus-ring": "#EAE3D8",
  "--card-inner-border": "rgba(197, 181, 155, 0.18)",

  "--gray-stroke": "#343437",
  "--border-subtle": "rgba(250, 250, 248, 0.075)",
  "--border-default": "rgba(250, 250, 248, 0.135)",
  "--border-strong": "rgba(250, 250, 248, 0.22)",
  "--surface-hover": "rgba(250, 250, 248, 0.055)",
  "--surface-active": "rgba(250, 250, 248, 0.09)",
};

export function normalizarHex(valor?: string | null): string | null {
  if (!valor) return null;
  const limpo = valor.trim();
  const comHash = limpo.startsWith("#") ? limpo : `#${limpo}`;
  if (!/^#[0-9a-fA-F]{6}$/.test(comHash)) return null;
  return comHash.toUpperCase();
}

function hexParaRgb(hex: string): Rgb {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function rgbParaHex({ r, g, b }: Rgb): string {
  const parte = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${parte(r)}${parte(g)}${parte(b)}`.toUpperCase();
}

function rgba(rgb: Rgb, alpha: number): string {
  return `rgba(${clampByte(rgb.r)}, ${clampByte(rgb.g)}, ${clampByte(rgb.b)}, ${alpha})`;
}

function misturarHex(hexA: string, hexB: string, fatorB: number): string {
  const a = hexParaRgb(hexA);
  const b = hexParaRgb(hexB);
  const t = Math.max(0, Math.min(1, fatorB));
  return rgbParaHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

function rgbParaHsl(rgb: Rgb): Hsl {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h / 6, s, l };
}

function hslParaHex({ h, s, l }: Hsl): string {
  const hue2rgb = (p: number, q: number, t: number) => {
    let u = t;
    if (u < 0) u += 1;
    if (u > 1) u -= 1;
    if (u < 1 / 6) return p + (q - p) * 6 * u;
    if (u < 1 / 2) return q;
    if (u < 2 / 3) return p + (q - p) * (2 / 3 - u) * 6;
    return p;
  };
  if (s <= 0.0001) {
    const v = l * 255;
    return rgbParaHex({ r: v, g: v, b: v });
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return rgbParaHex({
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  });
}

function canalLinear(valor: number): number {
  const v = valor / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminanciaRelativa(hex: string): number {
  const { r, g, b } = hexParaRgb(hex);
  return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
}

export function razaoContraste(hexA: string, hexB: string): number {
  const la = luminanciaRelativa(hexA);
  const lb = luminanciaRelativa(hexB);
  const maior = Math.max(la, lb);
  const menor = Math.min(la, lb);
  return (maior + 0.05) / (menor + 0.05);
}

export function validarCorFundo(valor?: string | null): ValidacaoCor {
  const hex = normalizarHex(valor);
  if (!hex) {
    return { valida: false, erro: "Informe uma cor de fundo em formato HEX válido (ex.: #111111)." };
  }
  const lum = luminanciaRelativa(hex);
  const contraste = razaoContraste(TEXT_PRIMARY_HEX, hex);
  if (lum > LUMINANCIA_MAXIMA_FUNDO) {
    return {
      valida: false,
      hex,
      luminancia: lum,
      contrasteTexto: contraste,
      erro: "Cor de fundo clara demais para o tema editorial escuro. Escolha um tom escuro (ex.: #111111 a #262626).",
    };
  }
  return { valida: true, hex, luminancia: lum, contrasteTexto: contraste };
}

export function validarCorDestaque(valor?: string | null): ValidacaoCor {
  const hex = normalizarHex(valor);
  if (!hex) {
    return { valida: false, erro: "Informe uma cor de destaque em formato HEX válido (ex.: #C5B59B)." };
  }
  return { valida: true, hex, luminancia: luminanciaRelativa(hex) };
}

export function ehTemaPadrao(fundo?: string | null, destaque?: string | null): boolean {
  const f = normalizarHex(fundo);
  const d = normalizarHex(destaque);
  if (!f || !d) return false;
  if (f === COR_FUNDO_PADRAO && d === COR_DESTAQUE_PADRAO) return true;
  return (
    (f === "#0D0D0D" && d === "#E6C89B") ||
    (f === "#121212" && d === "#D4BD98") ||
    (f === "#0E0E0F" && d === "#D4B48C")
  );
}

function elevarMinimoCanal(hex: string, minimo: number): string {
  const rgb = hexParaRgb(hex);
  return rgbParaHex({
    r: Math.max(rgb.r, minimo),
    g: Math.max(rgb.g, minimo),
    b: Math.max(rgb.b, minimo + 2),
  });
}

function clarearAteContraste(corHex: string, fundoHex: string, alvo: number): string {
  if (razaoContraste(corHex, fundoHex) >= alvo) return corHex;
  const hsl = rgbParaHsl(hexParaRgb(corHex));
  // Tons acromáticos muito escuros (como #000000) permanecem neutros sem puxar matiz.
  const saturacao = hsl.s < 0.04 ? 0 : Math.min(hsl.s, 0.88);
  let atual = corHex;
  for (let i = 1; i <= 48; i++) {
    const l = Math.min(0.96, hsl.l + (0.96 - hsl.l) * (i / 48));
    atual = hslParaHex({ h: hsl.h, s: saturacao, l });
    if (razaoContraste(atual, fundoHex) >= alvo) return atual;
  }
  return misturarHex(corHex, TEXT_PRIMARY_HEX, 0.85);
}

function derivarBotaoPrimario(destaque: string, fundoSuperficie: string): {
  fill: string;
  ink: string;
  inkMuted: string;
  hover: string;
  pressed: string;
  ajustado: boolean;
} {
  let fill = destaque;
  let ajustado = false;

  // Se o destaque escolhido for muito escuro para botão sobre fundo escuro (ex.: #000000),
  // eleva na mesma matiz até atingir visibilidade clara com texto escuro.
  if (razaoContraste(fill, fundoSuperficie) < 2.6) {
    fill = clarearAteContraste(fill, fundoSuperficie, 8.2);
    ajustado = true;
  }

  let cEscuro = razaoContraste(fill, DARK_INK_HEX);
  let cClaro = razaoContraste(fill, LIGHT_INK_HEX);
  let ink = cEscuro >= cClaro ? DARK_INK_HEX : LIGHT_INK_HEX;
  let contrasteInk = Math.max(cEscuro, cClaro);

  if (contrasteInk < 4.6) {
    const hsl = rgbParaHsl(hexParaRgb(fill));
    const preferirClaro = cClaro >= cEscuro - 0.35;
    for (let passo = 1; passo <= 32; passo++) {
      const delta = (passo / 32) * 0.25;
      const l = preferirClaro ? Math.max(0.08, hsl.l - delta) : Math.min(0.92, hsl.l + delta);
      const candidato = hslParaHex({ h: hsl.h, s: hsl.s, l });
      const novoInk = preferirClaro ? LIGHT_INK_HEX : DARK_INK_HEX;
      if (razaoContraste(candidato, novoInk) >= 4.65 && razaoContraste(candidato, fundoSuperficie) >= 2.6) {
        fill = candidato;
        ink = novoInk;
        ajustado = true;
        break;
      }
    }
    cEscuro = razaoContraste(fill, DARK_INK_HEX);
    cClaro = razaoContraste(fill, LIGHT_INK_HEX);
    if (Math.max(cEscuro, cClaro) < 4.5) {
      ink = cEscuro >= cClaro ? DARK_INK_HEX : LIGHT_INK_HEX;
    }
  }

  const inkEscura = ink === DARK_INK_HEX;
  const hslFill = rgbParaHsl(hexParaRgb(fill));

  const buscarVariacaoSegura = (deltaInicial: number, passo: number, fallbackMix: string, fallbackFator: number) => {
    for (let i = 0; i < 8; i++) {
      const l = Math.max(0.06, Math.min(0.98, hslFill.l + deltaInicial + passo * i));
      const candidato = hslParaHex({ h: hslFill.h, s: hslFill.s, l });
      if (razaoContraste(candidato, ink) >= 4.5 && candidato !== fill) return candidato;
    }
    const fallback = misturarHex(fill, fallbackMix, fallbackFator);
    return razaoContraste(fallback, ink) >= 4.5 ? fallback : fill;
  };

  let hover: string;
  let pressed: string;

  if (inkEscura) {
    hover = hslFill.l > 0.86
      ? buscarVariacaoSegura(-0.08, -0.02, "#111111", 0.09)
      : buscarVariacaoSegura(0.07, 0.02, "#FFFFFF", 0.14);
    pressed = buscarVariacaoSegura(-0.1, 0.02, "#111111", 0.14);
  } else {
    hover = buscarVariacaoSegura(0.06, -0.015, "#FFFFFF", 0.12);
    pressed = buscarVariacaoSegura(-0.09, -0.015, "#000000", 0.16);
  }

  return {
    fill,
    ink,
    inkMuted: inkEscura ? "rgba(14, 14, 16, 0.76)" : "rgba(255, 255, 255, 0.84)",
    hover,
    pressed,
    ajustado,
  };
}

export function derivarTema(fundoEntrada?: string | null, destaqueEntrada?: string | null): TemaDerivado {
  const validFundo = validarCorFundo(fundoEntrada);
  const validDestaque = validarCorDestaque(destaqueEntrada);

  const usouFallbackFundo = !validFundo.valida;
  const usouFallbackDestaque = !validDestaque.valida;

  const fundoBruto = validFundo.valida && validFundo.hex ? validFundo.hex : COR_FUNDO_PADRAO;
  const destaqueBruto = validDestaque.valida && validDestaque.hex ? validDestaque.hex : COR_DESTAQUE_PADRAO;

  if (ehTemaPadrao(fundoBruto, destaqueBruto)) {
    return {
      fundo: COR_FUNDO_PADRAO,
      destaque: COR_DESTAQUE_PADRAO,
      ehPadrao: true,
      usouFallbackFundo,
      usouFallbackDestaque,
      cssVars: { ...TOKENS_PADRAO },
      metricas: {
        contrasteFundoTexto: Number(razaoContraste(TEXT_PRIMARY_HEX, COR_FUNDO_PADRAO).toFixed(2)),
        contrasteBotaoPrimario: Number(razaoContraste(BOTAO_PRIMARIO_PADRAO, COR_FUNDO_PADRAO).toFixed(2)),
        contrasteDestaqueTexto: Number(razaoContraste(COR_DESTAQUE_PADRAO, "#171717").toFixed(2)),
        ajustouDestaqueParaContraste: false,
      },
    };
  }

  const fundoRgb = hexParaRgb(fundoBruto);
  const bgSurface = elevarMinimoCanal(misturarHex(fundoBruto, "#F4F4F6", 0.055), 14);
  const bgSurface2 = elevarMinimoCanal(misturarHex(fundoBruto, "#F4F4F6", 0.115), 24);
  const bgSurface3 = elevarMinimoCanal(misturarHex(fundoBruto, "#F4F4F6", 0.175), 35);
  const bgShimmer = misturarHex(bgSurface2, "#FFFFFF", 0.085);
  const grayStroke = misturarHex(fundoBruto, "#FFFFFF", 0.21);

  const surface2Rgb = hexParaRgb(bgSurface2);
  const backdropHex = misturarHex(fundoBruto, "#000000", 0.45);
  const backdropRgb = hexParaRgb(backdropHex);

  const lumFundo = luminanciaRelativa(fundoBruto);
  const reforcoBorda = lumFundo > 0.03 ? 0.025 : 0;

  const textSecondary = clarearAteContraste("#B3B0AA", bgSurface2, 4.9);
  const textMuted = clarearAteContraste("#908D87", bgSurface2, 4.5);

  const botao = derivarBotaoPrimario(destaqueBruto, bgSurface);
  const accentLegivel = clarearAteContraste(destaqueBruto, bgSurface2, 4.8);
  const accentTexto = clarearAteContraste(accentLegivel, bgSurface2, 6.2);
  const accentLegivelRgb = hexParaRgb(accentLegivel);
  const focusRingRgb = hexParaRgb(accentTexto);
  const bgSurfaceElevated = misturarHex(bgSurface, accentLegivel, 0.035);

  const cssVars: Record<string, string> = {
    "--bg-canvas": fundoBruto,
    "--bg-surface": bgSurface,
    "--bg-surface-2": bgSurface2,
    "--bg-surface-3": bgSurface3,
    "--bg-surface-elevated": bgSurfaceElevated,
    "--bg-glass": rgba(fundoRgb, 0.96),
    "--bg-backdrop": rgba(backdropRgb, 0.78),
    "--bg-panel-tint": rgba(surface2Rgb, 0.52),
    "--bg-shimmer": bgShimmer,
    "--bg-scrim-rgb": `${fundoRgb.r}, ${fundoRgb.g}, ${fundoRgb.b}`,

    "--text-primary": TEXT_PRIMARY_HEX,
    "--text-secondary": textSecondary,
    "--text-muted": textMuted,
    "--text-on-accent": botao.ink,
    "--text-on-accent-muted": botao.inkMuted,

    "--accent": accentLegivel,
    "--accent-primary": botao.fill,
    "--accent-sand": botao.fill,
    "--accent-text": accentTexto,
    "--accent-hover": botao.hover,
    "--accent-pressed": botao.pressed,
    "--accent-soft": rgba(accentLegivelRgb, 0.13),
    "--accent-soft-subtle": rgba(accentLegivelRgb, 0.075),
    "--accent-border": rgba(accentLegivelRgb, 0.36),
    "--accent-ring": rgba(focusRingRgb, 0.5),
    "--focus-ring": accentTexto,
    "--card-inner-border": rgba(accentLegivelRgb, 0.22),

    "--gray-stroke": grayStroke,
    "--border-subtle": `rgba(250, 250, 248, ${(0.08 + reforcoBorda).toFixed(3)})`,
    "--border-default": `rgba(250, 250, 248, ${(0.145 + reforcoBorda).toFixed(3)})`,
    "--border-strong": `rgba(250, 250, 248, ${(0.23 + reforcoBorda).toFixed(3)})`,
    "--surface-hover": "rgba(250, 250, 248, 0.055)",
    "--surface-active": "rgba(250, 250, 248, 0.095)",
  };

  return {
    fundo: fundoBruto,
    destaque: destaqueBruto,
    ehPadrao: false,
    usouFallbackFundo,
    usouFallbackDestaque,
    cssVars,
    metricas: {
      contrasteFundoTexto: Number(razaoContraste(TEXT_PRIMARY_HEX, fundoBruto).toFixed(2)),
      contrasteBotaoPrimario: Number(razaoContraste(botao.fill, botao.ink).toFixed(2)),
      contrasteDestaqueTexto: Number(razaoContraste(accentTexto, bgSurface2).toFixed(2)),
      ajustouDestaqueParaContraste: botao.ajustado,
    },
  };
}

export function aplicarTemaNoDocumento(tema: TemaDerivado): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const [chave, valor] of Object.entries(tema.cssVars)) {
    root.style.setProperty(chave, valor);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", tema.fundo);
  }
}
