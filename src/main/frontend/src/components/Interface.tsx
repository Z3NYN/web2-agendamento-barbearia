import { cloneElement, useEffect, useId, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, RefreshCw, X } from "lucide-react";

export function Titulo({ titulo, detalhe, acao, eyebrow }: {
  titulo: string; detalhe?: string; acao?: ReactNode; eyebrow?: string;
}) {
  return (
    <header className="page-head">
      <div className="page-head-copy">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{titulo}</h1>
        {detalhe && <p className="page-head-sub">{detalhe}</p>}
      </div>
      {acao && <div className="page-head-action">{acao}</div>}
    </header>
  );
}

export function Campo({ nome, children, dica }: { nome: string; children: ReactElement<{ id?: string }>; dica?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{nome}</label>
      {cloneElement(children, { id })}
      {dica && <span className="field-hint">{dica}</span>}
    </div>
  );
}

function Toast({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setAberto(false), 5200);
    return () => window.clearTimeout(id);
  }, []);
  if (!aberto) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      <CheckCircle2 size={17} strokeWidth={1.75} className="toast-icon" />
      <span>{texto}</span>
      <button type="button" className="icon-btn icon-btn--ghost icon-btn--sm" aria-label="Dispensar aviso" onClick={() => setAberto(false)}>
        <X size={15} strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function SkeletonCards({ quantidade = 3, horizontal = false }: { quantidade?: number; horizontal?: boolean }) {
  return (
    <div className={horizontal ? "skeleton-row" : "skeleton-grid"} role="status" aria-label="Carregando conteúdo">
      {Array.from({ length: quantidade }, (_, i) => (
        <div className="skeleton-card" key={i} aria-hidden="true">
          <div className="skeleton-media shimmer" />
          <div className="skeleton-body">
            <span className="skeleton-line skeleton-line--md shimmer" />
            <span className="skeleton-line skeleton-line--sm shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ quantidade = 3 }: { quantidade?: number }) {
  return (
    <div className="skeleton-list" role="status" aria-label="Carregando lista">
      {Array.from({ length: quantidade }, (_, i) => (
        <div className="skeleton-list-item" key={i} aria-hidden="true">
          <div className="skeleton-thumb shimmer" />
          <div className="skeleton-body">
            <span className="skeleton-line skeleton-line--md shimmer" />
            <span className="skeleton-line skeleton-line--sm shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonSlots({ quantidade = 8 }: { quantidade?: number }) {
  return (
    <div className="time-grid" role="status" aria-label="Carregando horários">
      {Array.from({ length: quantidade }, (_, i) => (
        <span className="skeleton-slot shimmer" key={i} aria-hidden="true" />
      ))}
    </div>
  );
}

export function Aviso({ erro, sucesso, carregando, aoTentarNovamente }: {
  erro?: string; sucesso?: string; carregando?: boolean; aoTentarNovamente?: () => void;
}) {
  if (erro) {
    return (
      <div className="alert alert--error" role="alert">
        <AlertCircle size={17} strokeWidth={1.75} />
        <span className="alert-body">{erro}</span>
        {aoTentarNovamente && (
          <button type="button" className="alert-retry" onClick={aoTentarNovamente}>
            <RefreshCw size={13} strokeWidth={1.75} /> Tentar novamente
          </button>
        )}
      </div>
    );
  }
  if (sucesso) return <Toast key={sucesso} texto={sucesso} />;
  if (carregando) {
    return (
      <div className="skeleton-inline" role="status" aria-label="Carregando">
        <span className="skeleton-line skeleton-line--md shimmer" />
        <span className="skeleton-line skeleton-line--sm shimmer" />
      </div>
    );
  }
  return null;
}

export function Vazio({ texto, acao }: { texto: string; acao?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><CalendarDays size={19} strokeWidth={1.65} /></div>
      <p>{texto}</p>
      {acao && <div className="empty-state-action">{acao}</div>}
    </div>
  );
}
