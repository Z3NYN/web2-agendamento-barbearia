import { createContext, useContext } from "react";
import type { Marca } from "../types/Barbearia";

export const contexto = createContext<{ marca?: Marca; erro?: string; atualizar: (m: Marca) => void }>({
  atualizar: () => undefined,
});
export const useMarca = () => useContext(contexto);
