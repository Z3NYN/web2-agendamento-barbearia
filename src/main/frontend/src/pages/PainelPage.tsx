import { ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, Clock3, Scissors, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Aviso, Titulo, Vazio } from "../components/Interface";
import { data, hoje, hora, instanteAgenda, statusTexto } from "../services/formato";
import { useAgora } from "../services/useAgora";
import { useConsulta } from "../services/useConsulta";
import type { Agendamento, Barbeiro } from "../types/Barbearia";

export default function PainelPage() {
  const dia = hoje();
  const agora = useAgora();
  const agenda = useConsulta<Agendamento[]>(`/agendamentos?data=${dia}`, 5000);
  const equipe = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const proximos = useConsulta<Agendamento[]>("/agendamentos/proximos", 5000);
  const proximosHoje = agenda.dados?.filter(a => instanteAgenda(a.inicio) > agora && ["RESERVADO", "CONFIRMADO"].includes(a.status));
  const indicadores = [
    { nome: "Agendamentos", valor: agenda.dados?.length, Icone: CalendarDays },
    { nome: "Próximos hoje", valor: proximosHoje?.length, Icone: Clock3 },
    { nome: "Concluídos", valor: agenda.dados?.filter(a => a.status === "CONCLUIDO").length, Icone: CheckCircle2 },
    { nome: "Cancelados", valor: agenda.dados?.filter(a => a.status === "CANCELADO").length, Icone: XCircle },
    { nome: "Profissionais ativos", valor: equipe.dados?.length, Icone: Scissors },
  ];
  return <div className="studio-dashboard stack">
    <Titulo titulo="Visão geral" detalhe={data(dia)} acao={<Link to="/agendar" className="button button--primario"><CalendarPlus size={18} /> Nova reserva</Link>} />
    <Aviso erro={agenda.erro || equipe.erro || proximos.erro} carregando={agenda.carregando || equipe.carregando || proximos.carregando} />
    <div className="dashboard-metricas">{indicadores.map(({ nome, valor, Icone }) => <article className="panel" key={nome}>
      <Icone size={20} className="accent" /><strong>{valor ?? "—"}</strong><span className="muted">{nome}</span>
    </article>)}</div>
    <section className="panel stack">
      <div className="section-heading"><h2>Próximos atendimentos</h2><Link className="studio-text-link" to="/agenda">Ver agenda <ArrowRight size={15} /></Link></div>
      {proximos.dados?.length === 0 && <Vazio texto="Nenhum atendimento agendado para os próximos sete dias." />}
      {proximos.dados?.map(a => <Link to={`/agenda?data=${a.inicio.slice(0, 10)}`} className="dashboard-linha" key={a.id}>
        <strong>{hora(a.inicio)}<small>{data(a.inicio)}</small></strong><span>{a.cliente}<small>{a.servico} · {a.barbeiro}</small></span>
        <span className={`status status--${a.status.toLowerCase()}`}>{statusTexto[a.status]}</span>
      </Link>)}
    </section>
    <div className="dashboard-atalhos">
      <Link className="panel studio-text-link" to="/clientes">Clientes <ArrowRight size={16} /></Link>
      <Link className="panel studio-text-link" to="/profissionais">Profissionais <ArrowRight size={16} /></Link>
      <Link className="panel studio-text-link" to="/marca">Personalização <ArrowRight size={16} /></Link>
    </div>
  </div>;
}
