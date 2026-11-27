import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { hora } from "../services/formato";
import { PERIODOS_PAINEL, usePainelGestao } from "../services/usePainel";

export default function FiltrosPainel({
  estado,
}: {
  estado: ReturnType<typeof usePainelGestao>;
}) {
  const [mostrarDatas, setMostrarDatas] = useState(estado.periodo === "PERSONALIZADO");
  const exibirPersonalizado = estado.periodo === "PERSONALIZADO" || mostrarDatas;
  const dados = estado.resumo.dados;

  return (
    <section className="surface-card mgmt-filter-bar" aria-label="Filtros do painel">
      <div className="mgmt-filter-top">
        <div className="segmented mgmt-period-pills" role="group" aria-label="Período de análise">
          {PERIODOS_PAINEL.map(p => (
            <button
              key={p.id}
              type="button"
              aria-pressed={estado.periodo === p.id}
              onClick={() => {
                setMostrarDatas(p.id === "PERSONALIZADO");
                estado.definirPeriodo(p.id);
              }}
            >
              {p.rotulo}
            </button>
          ))}
        </div>

        <div className="mgmt-filter-right">
          <label className="mgmt-inline-select">
            <SlidersHorizontal size={14} strokeWidth={1.75} aria-hidden="true" />
            <span className="sr-only">Filtrar por profissional</span>
            <select
              aria-label="Filtrar por profissional"
              value={estado.barbeiroId}
              onChange={e => estado.definirBarbeiro(e.target.value)}
            >
              <option value="">Todos os profissionais</option>
              {estado.profissionais.map(b => (
                <option key={b.id} value={b.id}>
                  {b.nome}{b.ativo ? "" : " (Inativo)"}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="live-sync-pill"
            onClick={estado.recarregarAgora}
            title="Atualizar indicadores agora"
          >
            <span className={`live-dot${estado.resumo.desatualizado ? " is-stale" : ""}`} aria-hidden="true" />
            <span className="tabular">
              {estado.resumo.desatualizado
                ? "Reconectando"
                : dados?.geradoEm
                  ? `Atualizado ${hora(dados.geradoEm)}`
                  : "Sincronizando"}
            </span>
            <RefreshCw size={12} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {exibirPersonalizado && (
        <div className="mgmt-custom-dates">
          <label className="field">
            <span>Data inicial</span>
            <input
              type="date"
              value={estado.inicio}
              onChange={e => estado.definirInicio(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Data final</span>
            <input
              type="date"
              min={estado.inicio}
              value={estado.fim}
              onChange={e => estado.definirFim(e.target.value)}
            />
          </label>
        </div>
      )}

      {dados && (
        <div className="mgmt-context-line">
          <span><strong>{dados.contexto.rotuloPeriodo}</strong></span>
          <span className="mgmt-context-sep" aria-hidden="true">·</span>
          <span>{dados.contexto.metodologiaComparacao}</span>
          <span className="mgmt-context-sep" aria-hidden="true">·</span>
          <span>Fuso: {dados.contexto.fusoHorario}</span>
        </div>
      )}
    </section>
  );
}
