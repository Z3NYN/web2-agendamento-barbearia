import { createContext, useContext } from "react";
import type { Marca } from "../types/Barbearia";

export const contexto = createContext<{
  marca?: Marca;
  erro?: string;
  atualizar: (m: Marca) => void;
  aberturaVista: boolean;
  concluirAbertura: () => void;
}>({
  atualizar: () => undefined,
  aberturaVista: true,
  concluirAbertura: () => undefined,
});

export const useMarca = () => useContext(contexto);
