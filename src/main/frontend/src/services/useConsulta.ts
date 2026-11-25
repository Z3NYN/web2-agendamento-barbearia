import { useCallback, useEffect, useState } from "react";
import api from "./api";
import { mensagem } from "./formato";

export function useConsulta<T>(url: string | null, intervalo = 0) {
  const [resultado, setResultado] = useState<{ url: string; dados?: T; erro?: string; desatualizado?: boolean }>();
  const [versao, setVersao] = useState(0);
  const recarregar = useCallback(() => {
    if (!intervalo) setResultado(undefined);
    setVersao(v => v + 1);
  }, [intervalo]);
  useEffect(() => {
    if (!url) return;
    const endereco = url;
    const controle = new AbortController();
    let timer: number | undefined;
    let consultando = false;
    async function consultar() {
      if (consultando || controle.signal.aborted) return;
      window.clearTimeout(timer);
      consultando = true;
      try {
        const r = await api.get<T>(endereco, { signal: controle.signal, timeout: intervalo ? 10000 : undefined });
        if (!controle.signal.aborted) setResultado(anterior => intervalo && anterior?.url === endereco && anterior.dados !== undefined && JSON.stringify(anterior.dados) === JSON.stringify(r.data)
          ? (anterior.desatualizado ? { ...anterior, desatualizado: false } : anterior) : { url: endereco, dados: r.data });
      } catch (e) {
        if (!controle.signal.aborted) setResultado(anterior => intervalo && anterior?.url === endereco && anterior.dados !== undefined
          ? { ...anterior, desatualizado: true } : { url: endereco, erro: mensagem(e) });
      } finally {
        consultando = false;
        if (intervalo && !controle.signal.aborted && !document.hidden) timer = window.setTimeout(reativar, intervalo);
      }
    }
    function reativar() { if (!document.hidden) void consultar(); }
    void consultar();
    if (intervalo) {
      document.addEventListener("visibilitychange", reativar);
      window.addEventListener("online", reativar);
    }
    return () => { controle.abort(); window.clearTimeout(timer); document.removeEventListener("visibilitychange", reativar); window.removeEventListener("online", reativar); };
  }, [url, versao, intervalo]);
  const atual = url && resultado?.url === url ? resultado : undefined;
  return { dados: atual?.dados, erro: atual?.erro, desatualizado: Boolean(atual?.desatualizado), carregando: Boolean(url && !atual), recarregar };
}
