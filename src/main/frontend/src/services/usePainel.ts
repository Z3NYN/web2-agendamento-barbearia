import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { dataIsoValida, hoje } from "./formato";
import { useConsulta } from "./useConsulta";
import type { PeriodoPainel, ProfissionalFiltro, ResumoPainel } from "../types/Painel";

export const PERIODOS_PAINEL: ReadonlyArray<{ id: PeriodoPainel; rotulo: string }> = [
  { id: "HOJE", rotulo: "Hoje" },
  { id: "ESTA_SEMANA", rotulo: "Esta semana" },
  { id: "ESTE_MES", rotulo: "Este mês" },
  { id: "MES_ANTERIOR", rotulo: "Mês anterior" },
  { id: "PERSONALIZADO", rotulo: "Personalizado" },
];

const PERIODOS_VALIDOS = new Set<string>(PERIODOS_PAINEL.map(p => p.id));

export function formatarMinutos(minutos: number): string {
  if (!Number.isFinite(minutos) || minutos <= 0) return "0 min";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function usePainelGestao() {
  const [params, setParams] = useSearchParams();
  const periodoParam = params.get("periodo");
  const periodo: PeriodoPainel = periodoParam && PERIODOS_VALIDOS.has(periodoParam)
    ? (periodoParam as PeriodoPainel)
    : "ESTE_MES";
  const hojeStr = hoje();
  const inicioPadrao = `${hojeStr.slice(0, 7)}-01`;
  const inicio = dataIsoValida(params.get("inicio"), inicioPadrao);
  const fim = dataIsoValida(params.get("fim"), hojeStr);
  const barbeiroId = params.get("barbeiroId") ?? "";

  const query = new URLSearchParams({ periodo });
  if (periodo === "PERSONALIZADO") {
    query.set("inicio", inicio);
    query.set("fim", fim < inicio ? inicio : fim);
  }
  if (barbeiroId) {
    query.set("barbeiroId", barbeiroId);
  }

  const resumo = useConsulta<ResumoPainel>(`/painel/resumo?${query.toString()}`, 45000);
  const profissionais = useConsulta<ProfissionalFiltro[]>("/painel/profissionais");

  const ultimoRefresh = useRef(0);
  const refreshLimitado = useCallback(() => {
    const agoraMs = Date.now();
    if (agoraMs - ultimoRefresh.current < 2500) return;
    ultimoRefresh.current = agoraMs;
    resumo.recarregar();
  }, [resumo]);

  useEffect(() => {
    const onAtualizado = () => {
      if (!document.hidden) refreshLimitado();
    };
    window.addEventListener("soldado:agenda-atualizada", onAtualizado);
    return () => window.removeEventListener("soldado:agenda-atualizada", onAtualizado);
  }, [refreshLimitado]);

  function atualizarParams(atual: Record<string, string | null>) {
    const proximo = new URLSearchParams(params);
    for (const [k, v] of Object.entries(atual)) {
      if (!v) proximo.delete(k);
      else proximo.set(k, v);
    }
    setParams(proximo, { replace: true });
  }

  function definirPeriodo(novo: PeriodoPainel) {
    if (novo === "PERSONALIZADO") {
      atualizarParams({ periodo: novo, inicio, fim: fim < inicio ? inicio : fim });
    } else {
      atualizarParams({ periodo: novo, inicio: null, fim: null });
    }
  }

  return {
    periodo,
    inicio,
    fim,
    barbeiroId,
    searchQuery: params.toString() ? `?${params.toString()}` : "",
    resumo,
    profissionais: profissionais.dados ?? [],
    definirPeriodo,
    definirInicio: (valor: string) => atualizarParams({ periodo: "PERSONALIZADO", inicio: valor }),
    definirFim: (valor: string) => atualizarParams({ periodo: "PERSONALIZADO", fim: valor }),
    definirBarbeiro: (valor: string) => atualizarParams({ barbeiroId: valor || null }),
    recarregarAgora: () => {
      ultimoRefresh.current = Date.now();
      resumo.recarregar();
    },
  };
}
