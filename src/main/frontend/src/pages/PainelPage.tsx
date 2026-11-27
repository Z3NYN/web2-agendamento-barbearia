import { ArrowRight, CalendarDays, CalendarPlus, CheckCircle2, Clock3, DollarSign, Scissors, TrendingUp, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import { somarDias } from "../components/Semana";
import { AnimatedValue } from "../motion/Primitives";
import { compararInicioAsc, data, hoje, hora, instanteAgenda, moeda, statusTexto } from "../services/formato";
import { useAgora } from "../services/useAgora";
import { useConsulta } from "../services/useConsulta";
import type { Agendamento, Barbeiro } from "../types/Barbearia";

export default function PainelPage() {
  const dia = hoje();
  const agora = useAgora();
  const agenda = useConsulta<Agendamento[]>(`/agendamentos?data=${dia}`, 5000);
  const semana = useConsulta<Agendamento[]>(`/agendamentos?data=${dia}&ate=${somarDias(dia, 6)}`, 10000);
  const equipe = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const proximos = useConsulta<Agendamento[]>("/agendamentos/proximos", 5000);

  const proximosHoje = agenda.dados?.filter(a => instanteAgenda(a.inicio) > agora && ["RESERVADO", "CONFIRMADO"].includes(a.status));
  const concluidosHoje = agenda.dados?.filter(a => a.status === "CONCLUIDO") ?? [];
  const pendentesHoje = agenda.dados?.filter(a => a.status === "RESERVADO" || a.status === "CONFIRMADO") ?? [];
  const mapaAtivos = new Map<number, Agendamento>();
  for (const a of pendentesHoje) mapaAtivos.set(a.id, a);
  for (const a of proximos.dados ?? []) mapaAtivos.set(a.id, a);
  const proximosOrdenados = (agenda.dados || proximos.dados) ? Array.from(mapaAtivos.values()).toSorted(compararInicioAsc) : undefined;
  const ativosSemana = semana.dados?.filter(a => a.status !== "CANCELADO" && a.status !== "FALTOU").length;

  const faturamentoConcluidoHoje = concluidosHoje.filter(a => !a.beneficio).reduce((acc, a) => acc + Number(a.preco || 0), 0);
  const faturamentoPrevistoHoje = pendentesHoje.filter(a => !a.beneficio).reduce((acc, a) => acc + Number(a.preco || 0), 0);
  const faturamentoPrevistoSemana = semana.dados?.filter(a => (a.status === "RESERVADO" || a.status === "CONFIRMADO" || a.status === "CONCLUIDO") && !a.beneficio).reduce((acc, a) => acc + Number(a.preco || 0), 0);

  const indicadores = [
    { nome: "Agendamentos hoje", valor: agenda.dados?.length, Icone: CalendarDays },
    { nome: "Próximos hoje", valor: proximosHoje?.length, Icone: Clock3 },
    { nome: "Concluídos hoje", valor: agenda.dados ? concluidosHoje.length : undefined, Icone: CheckCircle2 },
    { nome: "Cancelados / faltas", valor: agenda.dados ? agenda.dados.filter(a => a.status === "CANCELADO" || a.status === "FALTOU").length : undefined, Icone: XCircle },
    { nome: "Profissionais ativos", valor: equipe.dados?.length, Icone: Scissors },
  ];

  return (
    <div className="dashboard stack">
      <Titulo eyebrow="Painel administrativo" titulo="Dashboard" detalhe={data(dia)}
        acao={<Link to="/agendar" className="btn btn--primario"><CalendarPlus size={16} strokeWidth={1.9} /> Nova reserva</Link>} />
      <Aviso erro={agenda.erro || equipe.erro || proximos.erro} aoTentarNovamente={agenda.erro ? agenda.recarregar : proximos.erro ? proximos.recarregar : equipe.erro ? equipe.recarregar : undefined} />
      <div className="kpi-band">
        {indicadores.map(({ nome, valor, Icone }) => (
          <article className="kpi-cell" key={nome}>
            <div className="kpi-cell-top"><span>{nome}</span><Icone size={15} strokeWidth={1.75} className="accent-icon" /></div>
            <strong className="display-metric">{valor !== undefined ? <AnimatedValue value={valor} format={n => String(Math.round(n))} /> : "—"}</strong>
          </article>
        ))}
      </div>
      <div className="dashboard-body-grid">
        <div className="revenue-stack">
          <article className="surface-card revenue-card">
            <div className="revenue-head"><span>Realizado hoje</span><DollarSign size={15} strokeWidth={1.75} className="accent-icon" /></div>
            <strong className="display-metric">{agenda.dados ? <AnimatedValue value={faturamentoConcluidoHoje} format={moeda} /> : "—"}</strong>
            <small>Soma real dos atendimentos concluídos hoje</small>
          </article>
          <article className="surface-card revenue-card">
            <div className="revenue-head"><span>Previsto hoje</span><TrendingUp size={15} strokeWidth={1.75} className="accent-icon" /></div>
            <strong className="display-metric">{agenda.dados ? <AnimatedValue value={faturamentoPrevistoHoje} format={moeda} /> : "—"}</strong>
            <small>Reservas e confirmações ativas no dia</small>
          </article>
          <article className="surface-card revenue-card">
            <div className="revenue-head"><span>Agenda dos próximos 7 dias</span><CalendarDays size={15} strokeWidth={1.75} className="accent-icon" /></div>
            <strong className="display-metric">{faturamentoPrevistoSemana !== undefined ? <AnimatedValue value={faturamentoPrevistoSemana} format={moeda} /> : "—"}</strong>
            <small>{ativosSemana !== undefined ? (ativosSemana === 1 ? "1 atendimento ativo na semana" : `${ativosSemana} atendimentos ativos na semana`) : "Carregando agenda"}</small>
          </article>
        </div>
        <section className="surface-card stack-sm">
          <div className="section-head"><h2>Próximos atendimentos</h2><Link className="text-link" to="/agenda">Abrir agenda <ArrowRight size={15} strokeWidth={1.75} /></Link></div>
          {proximos.carregando && <SkeletonList quantidade={3} />}
          {!proximos.carregando && proximosOrdenados?.length === 0 && <Vazio texto="Nenhum atendimento agendado para os próximos sete dias." />}
          {!!proximosOrdenados?.length && (
            <div className="dashboard-feed">
              {proximosOrdenados.map(a => (
                <Link to={`/agenda?data=${a.inicio.slice(0, 10)}`} className="feed-row" key={a.id}>
                  <div className="feed-time tabular"><strong>{hora(a.inicio)}</strong><small>{data(a.inicio)}</small></div>
                  <div className="feed-copy"><strong>{a.cliente}</strong><small>{a.servico} · {a.barbeiro}</small></div>
                  <span className={`status-pill status-pill--${a.status.toLowerCase()}`}><i className="status-dot" aria-hidden="true" />{statusTexto[a.status]}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
