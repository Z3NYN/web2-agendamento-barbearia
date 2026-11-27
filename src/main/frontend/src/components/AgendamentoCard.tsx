import { useState } from "react";
import { CalendarDays, Check, Clock3, Gift, RotateCcw, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAgora } from "../services/useAgora";
import type { Agendamento, Barbeiro, Status } from "../types/Barbearia";
import { data, hoje, hora, instanteAgenda, mensagem, moeda, statusTexto } from "../services/formato";
import api from "../services/api";
import Botao from "./Botao";
import { Aviso } from "./Interface";
import { PainelModal } from "./Experiencia";
import EscolherHorario from "./EscolherHorario";

export default function AgendamentoCard({ a, equipe, podeTrocarProfissional, barbeiros, recarregar }: {
  a: Agendamento; equipe: boolean; podeTrocarProfissional: boolean; barbeiros: Barbeiro[]; recarregar: (msg: string) => void;
}) {
  const agora = useAgora();
  const [reagendando, editar] = useState(false);
  const [barbeiro, setBarbeiro] = useState(String(a.barbeiroId));
  const [dia, setDia] = useState(a.inicio.slice(0, 10) >= hoje() ? a.inicio.slice(0, 10) : hoje());
  const [horario, setHorario] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmar, setConfirmar] = useState<"CANCELADO" | "FALTOU">();
  const [versao, setVersao] = useState(0);

  async function executar(tipo: Status | "REAGENDAR") {
    if (ocupado) return;
    setConfirmar(undefined);
    setOcupado(true);
    setErro("");
    try {
      const url = `/agendamentos/${a.id}`;
      if (tipo === "REAGENDAR") await api.put(url, { barbeiroId: Number(barbeiro), inicio: horario });
      else if (tipo === "CANCELADO") await api.delete(url);
      else await api.put(url + "/status", { status: tipo });
      editar(false);
      recarregar(tipo === "REAGENDAR" ? "Atendimento reagendado." : `Status atualizado para ${statusTexto[tipo]}.`);
    } catch (e) {
      setErro(mensagem(e));
      if (tipo === "REAGENDAR") { setHorario(""); setVersao(v => v + 1); }
    } finally { setOcupado(false); }
  }

  const lista = podeTrocarProfissional ? barbeiros : barbeiros.filter(b => b.id === a.barbeiroId);
  const url = reagendando && dia && barbeiro ? `/agendamentos/${a.id}/horarios?${new URLSearchParams({ data: dia, barbeiroId: barbeiro, v: String(versao) })}` : null;
  const encerrado = a.status === "CONCLUIDO" || a.status === "CANCELADO" || a.status === "FALTOU";

  return (
    <article className={`appt-row appt-row--${a.status.toLowerCase()}`}>
      <div className="appt-top">
        <div className="appt-title">
          <h3>{a.servico}</h3>
          <span className="appt-sub">{equipe ? a.cliente : a.barbeiro}</span>
        </div>
        <span className={`status-pill status-pill--${a.status.toLowerCase()}`}>
          <i className="status-dot" aria-hidden="true" />{statusTexto[a.status]}
        </span>
      </div>

      <div className="appt-meta">
        <span><CalendarDays size={14} strokeWidth={1.75} /> {data(a.inicio)}</span>
        <span className="tabular"><Clock3 size={14} strokeWidth={1.75} /> {hora(a.inicio)} – {hora(a.fim)}</span>
        {equipe && <span><UserRound size={14} strokeWidth={1.75} /> {a.barbeiro}</span>}
        {a.beneficio ? <span className="appt-benefit"><Gift size={14} strokeWidth={1.75} /> Fidelidade</span> : <strong className="appt-price tabular">{moeda(a.preco)}</strong>}
      </div>

      <Aviso erro={erro} />

      <div className="appt-actions">
        {a.podeAlterar && (
          <>
            {equipe && a.status === "RESERVADO" && <Botao compacto disabled={ocupado} onClick={() => void executar("CONFIRMADO")}><Check size={14} strokeWidth={2} /> Confirmar</Botao>}
            {equipe && a.status === "CONFIRMADO" && instanteAgenda(a.fim) <= agora && <Botao compacto disabled={ocupado} onClick={() => void executar("CONCLUIDO")}><Check size={14} strokeWidth={2} /> Concluir</Botao>}
            <Botao variante="neutro" compacto disabled={ocupado} onClick={() => editar(!reagendando)}>{reagendando ? "Fechar" : "Reagendar"}</Botao>
            <Botao variante="perigo" compacto disabled={ocupado} onClick={() => setConfirmar("CANCELADO")}>Cancelar</Botao>
            {equipe && instanteAgenda(a.inicio) <= agora && <Botao variante="fantasma" compacto disabled={ocupado} onClick={() => setConfirmar("FALTOU")}>Registrar falta</Botao>}
          </>
        )}
        {!equipe && (encerrado || !a.podeAlterar) && (
          <Link to={`/agendar?servico=${a.servicoId}&profissional=${a.barbeiroId}`} className="btn btn--neutro btn--compacto">
            <RotateCcw size={14} strokeWidth={1.75} /> Repetir agendamento
          </Link>
        )}
      </div>

      {confirmar && (
        <PainelModal titulo={confirmar === "CANCELADO" ? "Cancelar atendimento?" : "Registrar falta?"} fechar={() => setConfirmar(undefined)}>
          <p className="text-secondary">{a.servico} · {data(a.inicio)} às {hora(a.inicio)}</p>
          <div className="sheet-actions">
            <Botao variante="neutro" onClick={() => setConfirmar(undefined)}>Voltar</Botao>
            <Botao variante="perigo" onClick={() => void executar(confirmar)}>{confirmar === "CANCELADO" ? "Sim, cancelar" : "Confirmar falta"}</Botao>
          </div>
        </PainelModal>
      )}

      <div className={`collapsible${reagendando ? " is-open" : ""}`}>
        <div>
          {reagendando && (
            <form className="appt-reschedule" onSubmit={e => { e.preventDefault(); void executar("REAGENDAR"); }}>
              <EscolherHorario barbeiros={lista} barbeiro={barbeiro} setBarbeiro={setBarbeiro} dia={dia} setDia={setDia} horario={horario} setHorario={setHorario} url={url} />
              <Botao type="submit" disabled={!horario || ocupado}>{ocupado ? "Salvando…" : "Salvar novo horário"}</Botao>
            </form>
          )}
        </div>
      </div>
    </article>
  );
}
