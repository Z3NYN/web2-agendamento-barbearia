import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ImageOff, X } from "lucide-react";
import { useParallax, useScrollReveal } from "../motion/useMotion";

export function FotoEditorial({
  src,
  alt = "",
  className = "",
  prioridade = false,
  revelar = "fade",
  parallax = false,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
  prioridade?: boolean;
  revelar?: "fade" | "curtain" | "wipe";
  parallax?: boolean;
}) {
  const [falhou, setFalhou] = useState<string>();
  const [carregada, setCarregada] = useState<string>();
  const { ref: revealRef, visible } = useScrollReveal<HTMLDivElement>({
    disabled: prioridade || revelar === "fade",
  });
  const parallaxRef = useParallax<HTMLDivElement>(14, parallax);

  const valida = Boolean(src && src !== falhou);
  const pronta = Boolean(valida && carregada === src);
  const modo = revelar !== "fade" ? `media-frame--${revelar}` : "";
  const revelado = visible || prioridade;

  return (
    <div
      ref={node => {
        revealRef.current = node;
        parallaxRef.current = node;
      }}
      className={`media-frame ${modo}${valida && !pronta ? " is-loading" : ""}${pronta ? " is-loaded" : ""}${revelado ? " is-revealed" : ""} ${className}`.trim()}
    >
      {valida ? (
        <img
          src={src!}
          alt={alt}
          loading={prioridade ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setCarregada(src!)}
          onError={() => setFalhou(src!)}
        />
      ) : (
        <span className="media-fallback" aria-hidden="true">
          <ImageOff size={21} strokeWidth={1.4} />
        </span>
      )}
    </div>
  );
}

export function Vitrine({
  titulo,
  variante = "padrao",
  children,
}: {
  titulo: string;
  variante?: "padrao" | "compacta" | "galeria";
  children: ReactNode;
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
          const max = Math.max(1, t.scrollWidth - t.clientWidth);
          setPos(Math.min(1, Math.max(0, t.scrollLeft / max)));
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
            <button type="button" className="icon-btn" onClick={() => mover(-1)} aria-label={`Voltar em ${titulo}`}>
              <ChevronLeft size={17} />
            </button>
            <button type="button" className="icon-btn" onClick={() => mover(1)} aria-label={`Avançar em ${titulo}`}>
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PainelModal({
  titulo,
  fechar,
  children,
}: {
  titulo: string;
  fechar: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const anteriorFoco = useRef<HTMLElement | null>(null);

  useEffect(() => {
    anteriorFoco.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      anteriorFoco.current?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      className="sheet-dialog"
      aria-label={titulo}
      ref={ref}
      onCancel={e => {
        e.preventDefault();
        fechar();
      }}
      onClick={e => {
        if (e.target === e.currentTarget) fechar();
      }}
    >
      <div className="sheet-surface">
        <span className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <h2>{titulo}</h2>
          <button type="button" className="icon-btn icon-btn--ghost" onClick={fechar} aria-label="Fechar">
            <X size={19} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}
