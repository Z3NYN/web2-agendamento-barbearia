import { cloneElement, useEffect, useId, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import { CalendarDays, CheckCircle2, X } from "lucide-react";

export function Titulo({ titulo, detalhe, acao }: { titulo: string; detalhe?: string; acao?: ReactNode }) {
  return <header className="page-heading flex flex-wrap items-end justify-between gap-4">
    <div><h1>{titulo}</h1>{detalhe && <p>{detalhe}</p>}</div>{acao}
  </header>;
}
export function Campo({ nome, children }: { nome: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{nome}</label>{cloneElement(children, { id })}</div>;
}
function Toast({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(true);
  useEffect(() => {
    const id = window.setTimeout(() => setAberto(false), 6500);
    return () => window.clearTimeout(id);
  }, []);
  return aberto ? <div className="notice studio-success studio-toast" role="status">
    <CheckCircle2 size={18} /><span>{texto}</span>
    <button type="button" className="icon-btn" aria-label="Dispensar aviso" onClick={() => setAberto(false)}><X size={16} /></button>
  </div> : null;
}
export function Aviso({ erro, sucesso, carregando }: { erro?: string; sucesso?: string; carregando?: boolean }) {
  if (erro) return <p className="notice notice--error" role="alert">{erro}</p>;
  if (sucesso) return <Toast key={sucesso} texto={sucesso} />;
  if (carregando) return <div className="studio-loading" role="status"><span>Carregando…</span><i aria-hidden="true" /><i aria-hidden="true" /></div>;
  return null;
}
export function Vazio({ texto }: { texto: string }) {
  return <div className="empty"><CalendarDays size={21} /><p>{texto}</p></div>;
}
