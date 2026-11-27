import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { Marca } from "../types/Barbearia";
import { useConsulta } from "../services/useConsulta";
import { CHAVE_ABERTURA } from "../services/marcaLogo";
import { aplicarTemaNoDocumento, derivarTema } from "../theme/themeEngine";
import { useMotionPrefs } from "../motion/useMotion";
import { contexto } from "./useMarca";

export function MarcaProvider({ children }: { children: ReactNode }) {
  const consulta = useConsulta<Marca>("/publico/barbearia");
  const [alterada, atualizar] = useState<Marca>();
  const [aberturaVista, setAberturaVista] = useState(() => {
    try { return Boolean(localStorage.getItem(CHAVE_ABERTURA)); } catch { return true; }
  });

  const marca = alterada ?? consulta.dados;
  const tema = useMemo(
    () => derivarTema(marca?.corFundo, marca?.corDestaque),
    [marca?.corFundo, marca?.corDestaque]
  );
  const { lite } = useMotionPrefs();

  const concluirAbertura = useCallback(() => {
    try { localStorage.setItem(CHAVE_ABERTURA, "1"); } catch { /* Storage indisponível */ }
    setAberturaVista(true);
  }, []);

  useEffect(() => {
    if (marca) document.title = marca.nome;
  }, [marca]);

  useLayoutEffect(() => {
    aplicarTemaNoDocumento(tema);
  }, [tema]);

  return (
    <contexto.Provider value={{ marca, erro: consulta.erro, atualizar, aberturaVista, concluirAbertura }}>
      <div className="app" data-motion={lite ? "lite" : "full"} style={tema.cssVars as CSSProperties}>{children}</div>
    </contexto.Provider>
  );
}
