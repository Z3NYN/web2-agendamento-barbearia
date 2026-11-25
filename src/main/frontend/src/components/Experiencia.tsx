import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";

export function FotoEditorial({ src, alt = "", className = "", prioridade = false }: {
  src?: string | null; alt?: string; className?: string; prioridade?: boolean;
}) {
  const [falhou, setFalhou] = useState<string>();
  return <div className={`editorial-photo ${className}`}>
    {src && src !== falhou
      ? <img src={src} alt={alt} loading={prioridade ? "eager" : "lazy"} decoding="async" onError={() => setFalhou(src)} />
      : <span aria-hidden="true"><ImageOff size={23} strokeWidth={1.3} /></span>}
  </div>;
}

export function Vitrine({ titulo, children }: { titulo: string; children: ReactNode }) {
  const lista = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  function mover(delta: number) {
    if (lista.current) lista.current.scrollBy({ left: lista.current.clientWidth * delta * .78 });
  }
  return <div className="vitrine">
    <div className="vitrine-track" ref={lista} tabIndex={0} role="region" aria-label={titulo}
      onScroll={e => {
        const t = e.currentTarget;
        setPos(t.scrollLeft / Math.max(1, t.scrollWidth - t.clientWidth));
      }}
      onKeyDown={e => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault(); mover(e.key === "ArrowLeft" ? -1 : 1);
        }
      }}>{children}</div>
    <div className="vitrine-controls">
      <span aria-hidden="true"><i style={{ transform: `translateX(${pos * 200}%)` }} /></span>
      <button type="button" className="icon-btn" onClick={() => mover(-1)} aria-label={`Voltar em ${titulo}`}><ChevronLeft size={18} /></button>
      <button type="button" className="icon-btn" onClick={() => mover(1)} aria-label={`Avançar em ${titulo}`}><ChevronRight size={18} /></button>
    </div>
  </div>;
}

export function PainelModal({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog className="studio-dialog" aria-label={titulo} ref={ref} onCancel={fechar}
    onClick={e => { if (e.target === e.currentTarget) fechar(); }}>
    <div className="studio-dialog-content">
      <div className="section-heading"><h2>{titulo}</h2><button type="button" className="icon-btn" onClick={fechar} aria-label="Fechar"><X size={20} /></button></div>
      {children}
    </div>
  </dialog>;
}
