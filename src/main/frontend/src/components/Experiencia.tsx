import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { useMotionPrefs, useParallax, useScrollReveal } from "../motion/useMotion";

export function FotoEditorial({
  src, alt = "", className = "", prioridade = false, revelar = "fade", parallax = false, delay = 0,
}: {
  src?: string | null; alt?: string; className?: string; prioridade?: boolean;
  revelar?: "fade" | "curtain" | "wipe" | "expand"; parallax?: boolean; delay?: number;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [falhou, setFalhou] = useState<string>();
  const [carregada, setCarregada] = useState<string>();
  const { ref: revealRef, visible } = useScrollReveal<HTMLDivElement>({ disabled: false });
  const { containerRef, layerRef } = useParallax<HTMLDivElement>(26, parallax);

  // Garante revelação tanto para imagens em cache quanto após decode/failsafe
  useEffect(() => {
    if (!src) return;
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setCarregada(src);
      return;
    }
    const failsafe = window.setTimeout(() => {
      if (imgRef.current && imgRef.current.naturalWidth > 0) setCarregada(src);
    }, 900);
    return () => window.clearTimeout(failsafe);
  }, [src, visible]);

  const valida = Boolean(src && src !== falhou);
  const pronta = Boolean(valida && carregada === src);
  const animar = Boolean(pronta && (visible || prioridade));
  const style = delay ? ({ "--reveal-delay": `${delay}ms` } as CSSProperties) : undefined;

  return (
    <div
      ref={node => { revealRef.current = node; containerRef.current = node; }}
      style={style}
      className={`media-frame media-frame--${revelar}${valida && !pronta ? " is-loading" : ""}${pronta ? " is-loaded" : ""}${animar ? " is-animating" : ""} ${className}`.trim()}
    >
      {valida ? (
        <div className="parallax-layer" ref={layerRef}>
          <img
            ref={imgRef}
            src={src!}
            alt={alt}
            loading={prioridade || visible ? "eager" : "lazy"}
            decoding="async"
            onLoad={() => setCarregada(src!)}
            onError={() => setFalhou(src!)}
          />
        </div>
      ) : (
        <span className="media-fallback" aria-hidden="true"><ImageOff size={20} strokeWidth={1.5} /></span>
      )}
    </div>
  );
}

export function Vitrine({ titulo, variante = "padrao", children }: {
  titulo: string; variante?: "padrao" | "compacta" | "galeria"; children: ReactNode;
}) {
  const lista = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(0);
  const [temScroll, setTemScroll] = useState(false);

  useEffect(() => {
    const el = lista.current;
    if (!el) return;
    const checar = () => setTemScroll(el.scrollWidth > el.clientWidth + 8);
    checar();
    const ro = new ResizeObserver(checar);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  function mover(delta: number) {
    if (!lista.current) return;
    lista.current.scrollBy({ left: lista.current.clientWidth * delta * 0.82, behavior: "smooth" });
  }

  return (
    <div className={`carousel carousel--${variante}`}>
      <div
        className="carousel-track"
        ref={lista}
        tabIndex={0}
        role="region"
        aria-label={titulo}
        onScroll={e => {
          const t = e.currentTarget;
          setPos(Math.min(1, Math.max(0, t.scrollLeft / Math.max(1, t.scrollWidth - t.clientWidth))));
        }}
        onKeyDown={e => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault();
            mover(e.key === "ArrowLeft" ? -1 : 1);
          }
        }}
      >
        {children}
      </div>
      {temScroll && (
        <div className="carousel-controls">
          <span className="carousel-rail" aria-hidden="true">
            <i style={{ transform: `translateX(${pos * 210}%)` }} />
          </span>
          <div className="carousel-arrows">
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => mover(-1)} aria-label={`Voltar em ${titulo}`}>
              <ChevronLeft size={16} strokeWidth={1.75} />
            </button>
            <button type="button" className="icon-btn icon-btn--sm" onClick={() => mover(1)} aria-label={`Avançar em ${titulo}`}>
              <ChevronRight size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PainelModal({ titulo, fechar, children }: { titulo: string; fechar: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const anteriorFoco = useRef<HTMLElement | null>(null);
  const [fechando, setFechando] = useState(false);
  const { reduced } = useMotionPrefs();

  const encerrar = useCallback(() => {
    if (fechando) return;
    if (reduced) { fechar(); return; }
    setFechando(true);
    window.setTimeout(() => fechar(), 200);
  }, [fechando, fechar, reduced]);

  useEffect(() => {
    anteriorFoco.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { anteriorFoco.current?.focus({ preventScroll: true }); };
  }, []);

  return (
    <dialog className={`sheet-dialog${fechando ? " is-closing" : ""}`} aria-label={titulo} ref={ref}
      onCancel={e => { e.preventDefault(); encerrar(); }}
      onClick={e => { if (e.target === e.currentTarget) encerrar(); }}>
      <div className="sheet-surface">
        <span className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <h2>{titulo}</h2>
          <button type="button" className="icon-btn icon-btn--ghost icon-btn--sm" onClick={encerrar} aria-label="Fechar">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}

export function Expansivel({ titulo, padraoAberto = false, children }: {
  titulo: string; padraoAberto?: boolean; children: ReactNode;
}) {
  const [aberto, setAberto] = useState(padraoAberto);
  return (
    <section className={`accordion-card${aberto ? " is-open" : ""}`}>
      <button type="button" className="accordion-trigger" aria-expanded={aberto} onClick={() => setAberto(v => !v)}>
        <span>{titulo}</span>
        <span className="accordion-plus" aria-hidden="true" />
      </button>
      <div className={`collapsible${aberto ? " is-open" : ""}`}>
        <div><div className="accordion-content">{children}</div></div>
      </div>
    </section>
  );
}
