import { fotoDe } from "../components/FotosPublicas";
import type { Barbeiro, Foto, Servico } from "../types/Barbearia";

const pasta = "/studio/";
const servicos: Record<string, string> = {
  "Corte clássico": "corte.webp",
  "Barba": "barba.webp",
  "Corte + barba": "combo.webp",
  "Barba alinhada": "barba.webp",
  "Corte e barba": "combo.webp",
};
const profissionais: Record<string, string> = {
  "Rafa Demo": "rafa.webp",
  "Luiz Demo": "luiz.webp",
};

export const aberturaDemo = pasta + "abertura.webp";
export const interiorDemo = pasta + "interior.webp";

export function fotoServico(fotos: Foto[] | undefined, s: Servico, demo?: boolean) {
  return fotoDe(fotos, "SERVICO", s.id)?.url ?? (demo && servicos[s.nome] ? pasta + servicos[s.nome] : undefined);
}

export function fotoProfissional(fotos: Foto[] | undefined, b: Barbeiro, demo?: boolean) {
  return fotoDe(fotos, "BARBEIRO", b.id)?.url ?? (demo && profissionais[b.nome] ? pasta + profissionais[b.nome] : undefined);
}

export const galeriaDemo: Foto[] = [
  { id: "exemplo-corte", alvo: "GALERIA", cadastroId: null, legenda: "Degradê texturizado", categoria: "Cortes", url: pasta + "corte.webp" },
  { id: "exemplo-barba", alvo: "GALERIA", cadastroId: null, legenda: "Barba desenhada", categoria: "Barba", url: pasta + "barba.webp" },
  { id: "exemplo-combo", alvo: "GALERIA", cadastroId: null, legenda: "Corte e barba", categoria: "Cortes", url: pasta + "combo.webp" },
  { id: "exemplo-ambiente", alvo: "GALERIA", cadastroId: null, legenda: "Ambiente do studio", categoria: "Ambiente", url: interiorDemo },
];
