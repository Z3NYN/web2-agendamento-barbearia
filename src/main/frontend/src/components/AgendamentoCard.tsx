import { useState } from "react";
import { useAgora } from "../services/useAgora";
import { CalendarDays, Clock3, Gift, UserRound } from "lucide-react";
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
    setOcupado(true); setErro("");
    try {
      const url = `/agendamentos/${a.id}`;
      if (tipo === "REAGENDAR") await api.put(url, { barbeiroId: Number(barbeiro), inicio: horario });
      else if (tipo === "CANCELADO") await api.delete(url);
      else await api.put(url + "/status", { status: tipo });
      editar(false);
      recarregar(tipo === "REAGENDAR" ? "Atendimento reagendado." : `Atendimento atualizado. ${statusTexto[tipo]}.`);
    } catch (e) {
      setErro(mensagem(e));
      if (tipo === "REAGENDAR") { setHorario(""); setVersao(v => v + 1); }
    } finally { setOcupado(false); }
  }

  const lista = podeTrocarProfissional ? barbeiros : barbeiros.filter(b => b.id === a.barbeiroId);
  const url = dia && barbeiro ? `/agendamentos/${a.id}/horarios?${new URLSearchParams({ data: dia, barbeiroId: barbeiro, v: String(versao) })}` : null;
  return <article className="panel appointment">
    <div className="appointment-header">
      <div><h3>{a.servico}</h3><span className="muted">{equipe ? a.cliente : a.barbeiro}</span></div>
      <span className={`status status--${a.status.toLowerCase()}`}>{statusTexto[a.status]}</span>
    </div>
    <div className="appointment-meta">
      <span><CalendarDays size={17} />{data(a.inicio)}</span>
      <span><Clock3 size={17} />{hora(a.inicio)} – {hora(a.fim)}</span>
      {equipe && <span><UserRound size={17} />{a.barbeiro}</span>}
    </div>
    <p className="inline-icon">{a.beneficio ? <><Gift size={17} /> Benefício de fidelidade</> : moeda(a.preco)}</p>
    <Aviso erro={erro} />
    {a.podeAlterar && <div className="flex flex-wrap gap-2">
      {equipe && a.status === "RESERVADO" && <Botao disabled={ocupado} onClick={() => void executar("CONFIRMADO")}>Confirmar</Botao>}
      {equipe && a.status === "CONFIRMADO" && instanteAgenda(a.fim) <= agora &&
        <Botao disabled={ocupado} onClick={() => void executar("CONCLUIDO")}>Concluir atendimento</Botao>}
      <Botao variante="neutro" disabled={ocupado} onClick={() => editar(!reagendando)}>{reagendando ? "Fechar reagendamento" : "Reagendar"}</Botao>
      <Botao variante="perigo" disabled={ocupado} onClick={() => setConfirmar("CANCELADO")}>Cancelar</Botao>
      {equipe && instanteAgenda(a.inicio) <= agora && <Botao variante="neutro" disabled={ocupado}
        onClick={() => setConfirmar("FALTOU")}>Registrar falta</Botao>}
    </div>}
    {confirmar && <PainelModal titulo={confirmar === "CANCELADO" ? "Cancelar atendimento?" : "Registrar falta?"} fechar={() => setConfirmar(undefined)}>
      <p>{a.servico} · {data(a.inicio)} às {hora(a.inicio)}</p>
      <div className="flex flex-wrap gap-2"><Botao variante="neutro" onClick={() => setConfirmar(undefined)}>Voltar</Botao>
        <Botao variante="perigo" onClick={() => void executar(confirmar)}>{confirmar === "CANCELADO" ? "Sim, cancelar" : "Confirmar falta"}</Botao></div>
    </PainelModal>}
    {reagendando && <form className="form-stack subform" onSubmit={e => { e.preventDefault(); void executar("REAGENDAR"); }}>
      <EscolherHorario barbeiros={lista} barbeiro={barbeiro} setBarbeiro={setBarbeiro} dia={dia} setDia={setDia}
        horario={horario} setHorario={setHorario} url={url} />
      <Botao type="submit" disabled={!horario || ocupado}>Salvar novo horário</Botao>
    </form>}
  </article>;
}
