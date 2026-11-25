import { useState } from "react";
import { useAgora } from "../services/useAgora";
import { CalendarPlus } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Aviso, Campo, Titulo, Vazio } from "../components/Interface";
import AgendamentoCard from "../components/AgendamentoCard";
import { temPapel } from "../services/auth";
import { hoje, instanteAgenda, statusTexto } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import type { Agendamento, Barbeiro } from "../types/Barbearia";

export default function AgendaPage({ equipe = false }: { equipe?: boolean }) {
  const agora = useAgora();
  const admin = temPapel("ADMIN");
  const [params, setParams] = useSearchParams();
  const dia = params.get("data") ?? hoje();
  const [barbeiro, setBarbeiro] = useState("");
  const [filtro, setFiltro] = useState<"proximos" | "historico">("proximos");
  const [situacao, setSituacao] = useState<Agendamento["status"] | "">("");
  const [sucesso, setSucesso] = useState("");
  const barbeiros = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const agenda = useConsulta<Agendamento[]>(equipe
    ? `/agendamentos?data=${encodeURIComponent(dia)}${barbeiro ? "&barbeiroId=" + barbeiro : ""}` : "/agendamentos", equipe ? 5000 : 0);
  const visiveis = agenda.dados?.filter(a => {
    if (equipe) return !situacao || situacao === a.status;
    const futuro = (a.status === "RESERVADO" || a.status === "CONFIRMADO") && instanteAgenda(a.fim) > agora;
    return filtro === "proximos" ? futuro : !futuro;
  });
  const lista = !equipe && filtro === "proximos" ? visiveis?.toReversed() : visiveis;
  return <>
    <Titulo titulo={equipe ? "Agenda" : "Meus horários"} detalhe={equipe ? "Acompanhe os atendimentos por dia." : "Consulte suas reservas e seu histórico."}
      acao={(!equipe || admin) && <Link className="button button--primario" to="/agendar"><CalendarPlus size={18} /> {equipe ? "Nova reserva" : "Agendar horário"}</Link>} />
    {equipe ? <section className="panel grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Campo nome="Data da agenda"><input type="date" value={dia} onChange={e => {
        if (e.target.value) setParams({ data: e.target.value }); setSucesso("");
      }} /></Campo>
      {admin && <Campo nome="Filtrar por profissional"><select value={barbeiro} onChange={e => { setBarbeiro(e.target.value); setSucesso(""); }}>
        <option value="">Todos os profissionais</option>{barbeiros.dados?.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
      </select></Campo>}
      <Campo nome="Situação"><select value={situacao} onChange={e => setSituacao(e.target.value as Agendamento["status"] | "")}>
        <option value="">Todas as situações</option>{Object.entries(statusTexto).map(([chave, nome]) => <option key={chave} value={chave}>{nome}</option>)}
      </select></Campo>
    </section> : <div className="tabs" role="group" aria-label="Filtrar horários">
      <button type="button" aria-pressed={filtro === "proximos"} onClick={() => setFiltro("proximos")}>Próximos</button>
      <button type="button" aria-pressed={filtro === "historico"} onClick={() => setFiltro("historico")}>Histórico</button>
    </div>}
    <div className="stack agenda-results">
      {equipe && lista && lista.length > 0 && <div className="agenda-counts" aria-label="Resumo da agenda">
        <span><strong>{lista.length}</strong> no dia</span>
        <span><strong>{lista.filter(a => a.status === "RESERVADO").length}</strong> a confirmar</span>
        <span><strong>{lista.filter(a => a.status === "CONFIRMADO").length}</strong> confirmados</span>
        <span><strong>{lista.filter(a => a.status === "CONCLUIDO").length}</strong> concluídos</span>
      </div>}
      <Aviso erro={agenda.erro || barbeiros.erro} carregando={agenda.carregando} />
      <Aviso sucesso={sucesso} />
      {lista?.length === 0 && <Vazio texto={equipe ? "Nenhum atendimento para esse dia." : "Você não tem atendimentos nesta lista."} />}
      <div className="grid gap-4 lg:grid-cols-2">{lista?.map(a => <AgendamentoCard key={a.id} a={a}
        equipe={equipe} podeTrocarProfissional={!equipe || admin} barbeiros={barbeiros.dados ?? []}
        recarregar={msg => { setSucesso(msg); agenda.recarregar(); }} />)}</div>
    </div>
  </>;
}
