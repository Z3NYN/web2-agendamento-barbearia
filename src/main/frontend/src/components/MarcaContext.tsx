import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Marca } from "../types/Barbearia";
import { useConsulta } from "../services/useConsulta";

import { contexto } from "./useMarca";
export function MarcaProvider({ children }: { children: ReactNode }) {
  const consulta = useConsulta<Marca>("/publico/barbearia");
  const [alterada, atualizar] = useState<Marca>();
  const marca = alterada ?? consulta.dados;

  useEffect(() => {
    if (marca) document.title = marca.nome;
  }, [marca]);

  return <contexto.Provider value={{ marca, erro: consulta.erro, atualizar }}>
    <div className="app" style={marca ? {
      "--gold": marca.corDestaque, "--base": marca.corFundo,
    } as CSSProperties : undefined}>{children}</div>
  </contexto.Provider>;
}
