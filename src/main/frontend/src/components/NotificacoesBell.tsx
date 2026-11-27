import {
  Bell, BellRing, CalendarCheck2, CalendarClock, CalendarDays, CalendarX2,
  CheckCheck, Clock3, Gift, SlidersHorizontal, X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { obterToken } from "../services/auth";
import { dataHoraCurta, mensagem } from "../services/formato";
import { assinarWebPush, cancelarWebPush, possuiInscricaoPush, webPushSuportado } from "../services/pwa";
import Botao from "./Botao";

export type TipoNotificacao =
  | "NOVO_AGENDAMENTO"
  | "CONFIRMADO"
  | "CANCELADO"
  | "REAGENDADO"
  | "LEMBRETE"
  | "RECOMPENSA_FIDELIDADE";

export interface NotificacaoItem {
  id: number;
  tipo: TipoNotificacao;
  titulo: string;
  mensagem: string;
  destinoUrl: string;
  lida: boolean;
  criadaEm: string;
}

interface PainelNotificacoes {
  naoLidas: number;
  itens: NotificacaoItem[];
}

interface PreferenciasNotificacao {
  notifSistema: boolean;
  notifPush: boolean;
  notifLembretes: boolean;
  notifFidelidade: boolean;
}

function iconeDe(tipo: TipoNotificacao) {
  switch (tipo) {
    case "CONFIRMADO": return <CalendarCheck2 size={15} strokeWidth={1.75} />;
    case "CANCELADO": return <CalendarX2 size={15} strokeWidth={1.75} />;
    case "REAGENDADO": return <CalendarClock size={15} strokeWidth={1.75} />;
    case "LEMBRETE": return <Clock3 size={15} strokeWidth={1.75} />;
    case "RECOMPENSA_FIDELIDADE": return <Gift size={15} strokeWidth={1.75} />;
    default: return <CalendarDays size={15} strokeWidth={1.75} />;
  }
}

export default function NotificacoesBell() {
  const [aberto, setAberto] = useState(false);
  const [mostrarPrefs, setMostrarPrefs] = useState(false);
  const [painel, setPainel] = useState<PainelNotificacoes>({ naoLidas: 0, itens: [] });
  const [prefs, setPrefs] = useState<PreferenciasNotificacao>();
  const [pushAtivoLocal, setPushAtivoLocal] = useState(false);
  const [avisoLive, setAvisoLive] = useState<NotificacaoItem>();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const carregarPainel = useCallback(async () => {
    if (!obterToken()) return;
    try {
      const { data } = await api.get<PainelNotificacoes>("/notificacoes");
      setPainel(data);
    } catch { /* Mantém estado atual caso rede oscile. */ }
  }, []);

  const carregarPrefs = useCallback(async () => {
    if (!obterToken()) return;
    try {
      const [{ data }, inscrito] = await Promise.all([
        api.get<PreferenciasNotificacao>("/notificacoes/preferencias"),
        possuiInscricaoPush(),
      ]);
      setPrefs(data);
      setPushAtivoLocal(inscrito);
    } catch (e) {
      setErro(mensagem(e));
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => { void carregarPainel(); }, 0);
    return () => window.clearTimeout(t);
  }, [carregarPainel, pathname]);

  useEffect(() => {
    const token = obterToken();
    if (!token) return;
    const ctrl = new AbortController();
    let reconectarTimer: number | undefined;

    async function conectarStream() {
      try {
        const res = await fetch("/api/notificacoes/stream", {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error("SSE indisponível");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!ctrl.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocos = buffer.split(/\r?\n\r?\n/);
          buffer = blocos.pop() ?? "";
          for (const bloco of blocos) {
            let evento = "message";
            const linhasDados: string[] = [];
            for (const linha of bloco.split(/\r?\n/)) {
              if (linha.startsWith("event:")) evento = linha.slice(6).trim();
              else if (linha.startsWith("data:")) linhasDados.push(linha.slice(5).trim());
            }
            if (evento === "notificacao" && linhasDados.length > 0) {
              try {
                const nova = JSON.parse(linhasDados.join("\n")) as NotificacaoItem;
                setPainel(anterior => {
                  if (anterior.itens.some(i => i.id === nova.id)) return anterior;
                  return { naoLidas: anterior.naoLidas + (nova.lida ? 0 : 1), itens: [nova, ...anterior.itens].slice(0, 40) };
                });
                setAvisoLive(nova);
                window.clearTimeout(toastTimer.current);
                toastTimer.current = window.setTimeout(() => setAvisoLive(undefined), 5500);
              } catch { /* Ignora evento malformado. */ }
            }
          }
        }
      } catch {
        /* Reconecta suavemente caso a conexão SSE seja encerrada. */
      }
      if (!ctrl.signal.aborted) {
        reconectarTimer = window.setTimeout(() => { void conectarStream(); }, 5000);
      }
    }

    void conectarStream();
    const aoFocar = () => { if (!document.hidden) void carregarPainel(); };
    document.addEventListener("visibilitychange", aoFocar);
    return () => {
      ctrl.abort();
      window.clearTimeout(reconectarTimer);
      window.clearTimeout(toastTimer.current);
      document.removeEventListener("visibilitychange", aoFocar);
    };
  }, [carregarPainel]);

  useEffect(() => {
    if (!aberto) return;
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [aberto]);

  async function alternarPainel() {
    const proximo = !aberto;
    setAberto(proximo);
    setErro("");
    if (proximo) {
      void carregarPainel();
      void carregarPrefs();
    }
  }

  async function abrirDestino(item: NotificacaoItem) {
    setAberto(false);
    setAvisoLive(undefined);
    if (!item.lida) {
      setPainel(p => ({
        naoLidas: Math.max(0, p.naoLidas - 1),
        itens: p.itens.map(i => (i.id === item.id ? { ...i, lida: true } : i)),
      }));
      void api.put(`/notificacoes/${item.id}/lida`).catch(() => { /* Sincroniza na próxima carga. */ });
    }
    navigate(item.destinoUrl || "/inicio");
  }

  async function lerTodas() {
    setOcupado(true);
    try {
      await api.put("/notificacoes/ler-todas");
      setPainel(p => ({ naoLidas: 0, itens: p.itens.map(i => ({ ...i, lida: true })) }));
    } catch (e) { setErro(mensagem(e)); }
    finally { setOcupado(false); }
  }

  async function salvarPreferencia(parcial: Partial<PreferenciasNotificacao>) {
    if (!prefs) return;
    const atualizada = { ...prefs, ...parcial };
    setPrefs(atualizada);
    try {
      await api.put("/notificacoes/preferencias", atualizada);
    } catch (e) {
      setErro(mensagem(e));
      void carregarPrefs();
    }
  }

  async function alternarPushDispositivo() {
    setOcupado(true);
    setErro("");
    try {
      if (pushAtivoLocal) {
        await cancelarWebPush();
        setPushAtivoLocal(false);
        if (prefs) setPrefs({ ...prefs, notifPush: false });
      } else {
        const res = await assinarWebPush();
        if (res.ok) {
          setPushAtivoLocal(true);
          if (prefs) setPrefs({ ...prefs, notifPush: true });
        } else if (res.motivo === "negado") {
          setErro("Permissão de notificações negada no navegador. Os alertas seguem ativos no aplicativo.");
        } else {
          setErro("Web Push indisponível neste navegador. Os alertas seguem ativos no aplicativo.");
        }
      }
    } catch (e) {
      setErro(mensagem(e));
    } finally {
      setOcupado(false);
    }
  }

  const permissaoNegada = typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied";

  return (
    <div className="notif-anchor" ref={containerRef}>
      <button
        type="button"
        className={`icon-btn notif-trigger${painel.naoLidas > 0 ? " has-unread" : ""}`}
        aria-label={painel.naoLidas > 0 ? `Notificações (${painel.naoLidas} não lidas)` : "Notificações"}
        aria-expanded={aberto}
        aria-haspopup="dialog"
        onClick={() => void alternarPainel()}
      >
        {painel.naoLidas > 0 ? <BellRing size={17} strokeWidth={1.8} /> : <Bell size={17} strokeWidth={1.75} />}
        {painel.naoLidas > 0 && (
          <span className="notif-badge tabular" aria-hidden="true">
            {painel.naoLidas > 9 ? "9+" : painel.naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <section className="notif-panel" role="dialog" aria-label="Central de notificações">
          <header className="notif-panel-head">
            <div className="inline-title">
              <h2>Notificações</h2>
              {painel.naoLidas > 0 && <span className="meta-chip tabular">{painel.naoLidas} nova(s)</span>}
            </div>
            <div className="inline-actions">
              {painel.naoLidas > 0 && (
                <button type="button" className="notif-head-action" disabled={ocupado} onClick={() => void lerTodas()}>
                  <CheckCheck size={14} strokeWidth={1.75} /> Ler todas
                </button>
              )}
              <button
                type="button"
                className="icon-btn icon-btn--ghost icon-btn--sm"
                aria-label="Preferências de notificação"
                aria-expanded={mostrarPrefs}
                onClick={() => setMostrarPrefs(v => !v)}
              >
                <SlidersHorizontal size={15} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--ghost icon-btn--sm"
                aria-label="Fechar notificações"
                onClick={() => setAberto(false)}
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>
          </header>

          {erro && <p className="notif-error" role="alert">{erro}</p>}

          {mostrarPrefs && (
            <div className="notif-prefs">
              <div className="notif-push-box">
                <div className="stack-xs">
                  <strong>Alertas neste dispositivo</strong>
                  <small className="text-secondary">
                    {!webPushSuportado()
                      ? "Navegador sem suporte a Web Push — alertas em tempo real continuam ativos no app."
                      : permissaoNegada
                        ? "Permissão bloqueada no navegador. Libere nas configurações do site para receber alertas nativos."
                        : pushAtivoLocal
                          ? "Notificações nativas ativas mesmo com a aba em segundo plano."
                          : "Receba avisos de confirmação, lembretes e recompensas no aparelho."}
                  </small>
                </div>
                {webPushSuportado() && !permissaoNegada && (
                  <Botao
                    variante={pushAtivoLocal ? "neutro" : "primario"}
                    compacto
                    disabled={ocupado}
                    onClick={() => void alternarPushDispositivo()}
                  >
                    {pushAtivoLocal ? "Desativar neste dispositivo" : "Ativar neste dispositivo"}
                  </Botao>
                )}
              </div>
              {prefs && (
                <div className="notif-pref-checks">
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={prefs.notifSistema}
                      onChange={e => void salvarPreferencia({ notifSistema: e.target.checked })}
                    />
                    <span>Histórico e alertas no aplicativo</span>
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={prefs.notifLembretes}
                      onChange={e => void salvarPreferencia({ notifLembretes: e.target.checked })}
                    />
                    <span>Lembretes antes do horário</span>
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={prefs.notifFidelidade}
                      onChange={e => void salvarPreferencia({ notifFidelidade: e.target.checked })}
                    />
                    <span>Recompensas de fidelidade</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="notif-list">
            {painel.itens.length === 0 ? (
              <div className="notif-empty">
                <Bell size={18} strokeWidth={1.65} />
                <p>Nenhuma notificação por enquanto.</p>
              </div>
            ) : (
              painel.itens.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`notif-item${item.lida ? "" : " is-unread"}`}
                  onClick={() => void abrirDestino(item)}
                >
                  <span className="notif-item-icon">{iconeDe(item.tipo)}</span>
                  <span className="notif-item-copy">
                    <span className="notif-item-top">
                      <strong>{item.titulo}</strong>
                      <small className="tabular">{dataHoraCurta(item.criadaEm)}</small>
                    </span>
                    <span className="notif-item-msg">{item.mensagem}</span>
                  </span>
                  {!item.lida && <span className="notif-unread-dot" aria-label="Não lida" />}
                </button>
              ))
            )}
          </div>
        </section>
      )}

      {avisoLive && !aberto && (
        <div className="notif-live-toast" role="status" aria-live="polite">
          <button type="button" className="notif-live-body" onClick={() => void abrirDestino(avisoLive)}>
            <span className="notif-item-icon">{iconeDe(avisoLive.tipo)}</span>
            <span className="notif-item-copy">
              <strong>{avisoLive.titulo}</strong>
              <span className="notif-item-msg">{avisoLive.mensagem}</span>
            </span>
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--ghost icon-btn--sm"
            aria-label="Dispensar notificação"
            onClick={() => setAvisoLive(undefined)}
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>
      )}
    </div>
  );
}
