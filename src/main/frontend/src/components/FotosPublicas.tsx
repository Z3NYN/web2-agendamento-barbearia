import { useConsulta } from "../services/useConsulta";
import type { AlvoFoto, Foto } from "../types/Barbearia";

export function useFotos() {
  return useConsulta<Foto[]>("/publico/fotos");
}

export function fotoDe(fotos: Foto[] | undefined, alvo: AlvoFoto, cadastroId: number | null = null) {
  return fotos?.find(f => f.alvo === alvo && f.cadastroId === cadastroId);
}
