import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Marca } from "../types/Barbearia";
import { useConsulta } from "../services/useConsulta";
import { normalizarCores } from "../services/marcaLogo";
import { useMotionPrefs } from "../motion/useMotion";
import { contexto } from "./useMarca";

export function MarcaProvider({ children }: { children: ReactNode }) {
  const consulta = useConsulta<Marca>("/publico/barbearia");
  const [alterada, atualizar] = useState<Marca>();
  const marca = alterada ?? consulta.dados;
  const cores = normalizarCores(marca);
  const { lite } = useMotionPrefs();

  useEffect(() => {
    if (marca) document.title = marca.nome;
  }, [marca]);

  const estilo = {
    "--bg-canvas": cores.fundo,
    "--accent": cores.destaque,
  } as CSSProperties;

  return (
    <contexto.Provider value={{ marca, erro: consulta.erro, atualizar }}>
      <div className="app" data-motion={lite ? "lite" : "full"} style={estilo}>
        {children}
      </div>
    </contexto.Provider>
  );
}
