import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  DollarSign,
  Scissors,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import { somarDias } from "../components/Semana";
import { AnimatedValue } from "../motion/Primitives";
import { data, hoje, hora, instanteAgenda, moeda, statusTexto } from "../services/formato";
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

  const proximosHoje = agenda.dados?.filter(
    a => instanteAgenda(a.inicio) > agora && ["RESERVADO", "CONFIRMADO"].includes(a.status)
  );
  const concluidosHoje = agenda.dados?.filter(a => a.status === "CONCLUIDO") ?? [];
  const pendentesHoje = agenda.dados?.filter(a => a.status === "RESERVADO" || a.status === "CONFIRMADO") ?? [];

  const faturamentoConcluidoHoje = concluidosHoje
    .filter(a => !a.beneficio)
    .reduce((acc, a) => acc + Number(a.preco || 0), 0);

  const faturamentoPrevistoHoje = pendentesHoje
    .filter(a => !a.beneficio)
    .reduce((acc, a) => acc + Number(a.preco || 0), 0);

  const faturamentoPrevistoSemana = semana.dados
    ?.filter(a => (a.status === "RESERVADO" || a.status === "CONFIRMADO" || a.status === "CONCLUIDO") && !a.beneficio)
    .reduce((acc, a) => acc + Number(a.preco || 0), 0);

  const indicadores = [
    { nome: "Agendamentos hoje", valor: agenda.dados?.length, Icone: CalendarDays },
    { nome: "Próximos hoje", valor: proximosHoje?.length, Icone: Clock3 },
    { nome: "Concluídos hoje", valor: agenda.dados ? concluidosHoje.length : undefined, Icone: CheckCircle2 },
    {
      nome: "Cancelados / faltas",
      valor: agenda.dados
        ? agenda.dados.filter(a => a.status === "CANCELADO" || a.status === "FALTOU").length
        : undefined,
      Icone: XCircle,
    },
    { nome: "Profissionais ativos", valor: equipe.dados?.length, Icone: Scissors },
  ];

  return (
    <div className="dashboard stack">
      <Titulo
        eyebrow="Painel administrativo"
        titulo="Dashboard"
        detalhe={data(dia)}
        acao={
          <Link to="/agendar" className="btn btn--primario">
            <CalendarPlus size={17} /> Nova reserva
          </Link>
        }
      />

      <Aviso erro={agenda.erro || equipe.erro || proximos.erro} />

      <div className="metric-grid">
        {indicadores.map(({ nome, valor, Icone }) => (
          <article className="surface-card metric-card" key={nome}>
            <span className="metric-icon"><Icone size={17} /></span>
            <strong>
              {valor !== undefined ? <AnimatedValue value={valor} format={n => String(Math.round(n))} /> : "—"}
            </strong>
            <span>{nome}</span>
          </article>
        ))}
      </div>

      <div className="dashboard-body-grid">
        <div className="revenue-stack">
          <article className="surface-card revenue-card">
            <div className="revenue-head">
              <span>Faturamento concluído hoje</span>
              <DollarSign size={16} className="accent-icon" />
            </div>
            <strong>
              {agenda.dados ? <AnimatedValue value={faturamentoConcluidoHoje} format={moeda} /> : "—"}
            </strong>
            <small>Atendimentos concluídos hoje (exclui recompensas gratuitas)</small>
          </article>

          <article className="surface-card revenue-card">
            <div className="revenue-head">
              <span>Previsto hoje</span>
              <TrendingUp size={16} className="accent-icon" />
            </div>
            <strong>
              {agenda.dados ? <AnimatedValue value={faturamentoPrevistoHoje} format={moeda} /> : "—"}
            </strong>
            <small>Reservas e confirmações pendentes no dia</small>
          </article>

          <article className="surface-card revenue-card">
            <div className="revenue-head">
              <span>Movimento nos próximos 7 dias</span>
              <CalendarDays size={16} className="accent-icon" />
            </div>
            <strong>
              {faturamentoPrevistoSemana !== undefined ? (
                <AnimatedValue value={faturamentoPrevistoSemana} format={moeda} />
              ) : (
                "—"
              )}
            </strong>
            <small>
              {semana.dados
                ? `${semana.dados.filter(a => a.status !== "CANCELADO" && a.status !== "FALTOU").length} atendimentos ativos na semana`
                : "Carregando dados reais"}
            </small>
          </article>
        </div>

        <section className="surface-card stack-sm">
          <div className="section-head">
            <h2>Próximos atendimentos</h2>
            <Link className="text-link" to="/agenda">Abrir agenda <ArrowRight size={15} /></Link>
          </div>
          {proximos.carregando && <SkeletonList quantidade={3} />}
          {!proximos.carregando && proximos.dados?.length === 0 && (
            <Vazio texto="Nenhum atendimento agendado para os próximos sete dias." />
          )}
          {!!proximos.dados?.length && (
            <div className="dashboard-feed">
              {proximos.dados.map(a => (
                <Link to={`/agenda?data=${a.inicio.slice(0, 10)}`} className="feed-row" key={a.id}>
                  <div className="feed-time tabular">
                    <strong>{hora(a.inicio)}</strong>
                    <small>{data(a.inicio)}</small>
                  </div>
                  <div className="feed-copy">
                    <strong>{a.cliente}</strong>
                    <small>{a.servico} · {a.barbeiro}</small>
                  </div>
                  <span className={`status-pill status-pill--${a.status.toLowerCase()}`}>
                    <i className="status-dot" aria-hidden="true" />
                    {statusTexto[a.status]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
