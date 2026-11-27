import { Link } from "react-router-dom";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Info, Sparkles, TrendingUp } from "lucide-react";
import { temPermissao } from "../services/auth";
import type { InsightNegocio, SeveridadeInsight } from "../types/Painel";

function rotuloSeveridade(sev: SeveridadeInsight): string {
  switch (sev) {
    case "ALTA":
      return "Prioridade alta";
    case "ATENCAO":
      return "Atenção";
    case "POSITIVO":
      return "Destaque";
    default:
      return "Contexto";
  }
}

function classeSeveridade(sev: SeveridadeInsight): string {
  switch (sev) {
    case "ALTA":
      return "insight-card--high";
    case "ATENCAO":
      return "insight-card--warn";
    case "POSITIVO":
      return "insight-card--positive";
    default:
      return "insight-card--info";
  }
}

function IconeSeveridade({ sev }: { sev: SeveridadeInsight }) {
  switch (sev) {
    case "ALTA":
      return <AlertTriangle size={16} strokeWidth={1.85} aria-hidden="true" />;
    case "ATENCAO":
      return <TrendingUp size={16} strokeWidth={1.85} aria-hidden="true" />;
    case "POSITIVO":
      return <CheckCircle2 size={16} strokeWidth={1.85} aria-hidden="true" />;
    default:
      return <Info size={16} strokeWidth={1.85} aria-hidden="true" />;
  }
}

export function InsightsNegocioSection({
  insights,
  limite,
  titulo = "Insights do negócio",
  subtitulo = "Diagnósticos objetivos com base nos dados reais e regras de operação do período.",
  mostrarLinkTodos = false,
  searchQuery = "",
}: {
  insights: InsightNegocio[];
  limite?: number;
  titulo?: string;
  subtitulo?: string;
  mostrarLinkTodos?: boolean;
  searchQuery?: string;
}) {
  const exibidos = limite ? insights.slice(0, limite) : insights;

  return (
    <section className="mgmt-section" aria-label={titulo}>
      <div className="mgmt-section-head">
        <div className="insight-head-title">
          <div className="insight-head-row">
            <Sparkles size={16} strokeWidth={1.75} className="accent-icon" aria-hidden="true" />
            <h2>{titulo}</h2>
          </div>
          <p className="text-secondary">{subtitulo}</p>
        </div>
        {mostrarLinkTodos && insights.length > (limite ?? 0) && (
          <Link to={`/desempenho${searchQuery}`} className="btn btn--neutro btn--compacto">
            Ver todos os insights ({insights.length})
          </Link>
        )}
      </div>

      {exibidos.length === 0 ? (
        <div className="surface-card">
          <p className="text-secondary">Nenhum diagnóstico gerado para o recorte atual.</p>
        </div>
      ) : (
        <div className="insights-grid">
          {exibidos.map((item) => {
            const podeNavegar =
              Boolean(item.acaoUrl && item.acaoRotulo) &&
              (!item.permissaoAcao || temPermissao(item.permissaoAcao));
            return (
              <article key={item.id} className={`surface-card insight-card ${classeSeveridade(item.severidade)}`}>
                <div className="insight-card-top">
                  <span className={`insight-badge insight-badge--${item.severidade.toLowerCase()}`}>
                    <IconeSeveridade sev={item.severidade} />
                    <span>{rotuloSeveridade(item.severidade)}</span>
                  </span>
                  <span className="insight-category">{item.categoria}</span>
                </div>

                <h3 className="insight-title">{item.titulo}</h3>

                <dl className="insight-facts">
                  <div className="insight-fact">
                    <dt>O que aconteceu</dt>
                    <dd>{item.oQueAconteceu}</dd>
                  </div>
                  <div className="insight-fact">
                    <dt>Por que importa</dt>
                    <dd>{item.porQueImporta}</dd>
                  </div>
                  <div className="insight-fact insight-fact--action">
                    <dt>O que fazer</dt>
                    <dd>{item.oQueFazer}</dd>
                  </div>
                </dl>

                <footer className="insight-footer">
                  <div className="insight-meta">
                    <span>{item.evidencia}</span>
                    <span>Base: {item.amostra}</span>
                  </div>
                  {podeNavegar && item.acaoUrl && item.acaoRotulo && (
                    <Link to={item.acaoUrl} className="btn btn--neutro btn--compacto insight-cta">
                      <span>{item.acaoRotulo}</span>
                      <ArrowUpRight size={14} strokeWidth={1.85} aria-hidden="true" />
                    </Link>
                  )}
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
