import { useState } from "react";
import {
  AlertCircle, ArrowRight, BarChart3, CalendarPlus, Check,
  Clock3, DollarSign, Gift, Scissors, TrendingDown, TrendingUp, UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import Botao from "../components/Botao";
import FiltrosPainel from "../components/FiltrosPainel";
import { InsightsNegocioSection } from "../components/InsightsNegocioSection";
import { MetasMensaisSection } from "../components/MetasMensaisSection";
import { formatarMinutos, usePainelGestao } from "../services/usePainel";
import { GraficoAtividadeTempo, GraficoValorConcluidos } from "../components/GraficosGestao";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import api from "../services/api";
import { temAlgumaPermissao, temPapel, temPermissao } from "../services/auth";
import { hoje, hora, instanteAgenda, mensagem, moeda, statusTexto } from "../services/formato";
import { useAgora } from "../services/useAgora";
import type { Agendamento, Status } from "../types/Barbearia";
import type { VariacaoMetrica } from "../types/Painel";

function BadgeComparacao({ variacao, monetario = false }: { variacao: VariacaoMetrica; monetario?: boolean }) {
  if (!variacao.comparavel || variacao.deltaPercentual === null) {
    return <span className="kpi-delta is-neutral">Sem base comparável</span>;
  }
  const positivo = variacao.deltaAbsoluto > 0;
  const negativo = variacao.deltaAbsoluto < 0;
  const sinal = positivo ? "+" : "";
  const diffTexto = monetario
    ? `${sinal}${moeda(variacao.deltaAbsoluto)}`
    : `${sinal}${Math.round(variacao.deltaAbsoluto)}`;
  return (
    <span className={`kpi-delta ${positivo ? "is-up" : negativo ? "is-down" : "is-neutral"} tabular`}>
      {positivo && <TrendingUp size={12} strokeWidth={2} />}
      {negativo && <TrendingDown size={12} strokeWidth={2} />}
      {sinal}{variacao.deltaPercentual.toFixed(1)}% ({diffTexto})
    </span>
  );
}

export default function PainelPage() {
  const estado = usePainelGestao();
  const agora = useAgora();
  const diaHoje = hoje();
  const dados = estado.resumo.dados;

  const podeCriarAgendamento = temPermissao("AGENDAMENTOS_GERENCIAR");
  const podeAbrirAgenda = temPapel("BARBEIRO") || temAlgumaPermissao(
    "AGENDAMENTOS_CONSULTAR", "AGENDAMENTOS_GERENCIAR", "AGENDAMENTOS_CONFIRMAR_CONCLUIR"
  );
  const podeAlterarStatus = temPermissao("AGENDAMENTOS_CONFIRMAR_CONCLUIR");
  const podeClientes = temAlgumaPermissao("CLIENTES_GERENCIAR", "FIDELIDADE_ADMINISTRAR");
  const podeFidelidade = temPermissao("FIDELIDADE_ADMINISTRAR");
  const podeExpediente = temPermissao("DISPONIBILIDADE_GERENCIAR");

  const [acaoErro, setAcaoErro] = useState("");
  const [acaoSucesso, setAcaoSucesso] = useState("");
  const [ocupadoId, setOcupadoId] = useState<number>();

  async function atualizarStatusHoje(a: Agendamento, destino: Status) {
    if (ocupadoId) return;
    setOcupadoId(a.id);
    setAcaoErro("");
    setAcaoSucesso("");
    try {
      await api.put(`/agendamentos/${a.id}/status`, { status: destino });
      setAcaoSucesso(`Atendimento de ${a.cliente} atualizado para ${statusTexto[destino]}.`);
      estado.recarregarAgora();
    } catch (e) {
      setAcaoErro(mensagem(e));
    } finally {
      setOcupadoId(undefined);
    }
  }

  const sufixoAgenda = (statusFiltro?: string) => {
    const q = new URLSearchParams({ data: diaHoje });
    if (statusFiltro) q.set("status", statusFiltro);
    if (estado.barbeiroId) q.set("barbeiroId", estado.barbeiroId);
    return `/agenda?${q.toString()}`;
  };

  return (
    <div className="dashboard stack">
      <Titulo
        eyebrow="Gestão do negócio"
        titulo="Visão geral"
        detalhe={dados
          ? `${dados.contexto.rotuloPeriodo}${dados.contexto.barbeiroNome ? ` · ${dados.contexto.barbeiroNome}` : ""}`
          : "Indicadores operacionais e acompanhamento diário da barbearia."}
        acao={podeCriarAgendamento && (
          <Link to="/agendar" className="btn btn--primario">
            <CalendarPlus size={16} strokeWidth={1.9} /> Nova reserva
          </Link>
        )}
      />

      <FiltrosPainel estado={estado} />

      <Aviso
        erro={acaoErro || estado.resumo.erro}
        sucesso={acaoSucesso}
        aoTentarNovamente={estado.resumo.erro ? estado.recarregarAgora : undefined}
      />

      {estado.resumo.carregando && <SkeletonList quantidade={4} />}

      {dados && (
        <>
          <section className="mgmt-attention-band" aria-label="Atenção operacional de hoje">
            <div className="mgmt-section-inline-head">
              <h2>Hoje na barbearia</h2>
              {podeAbrirAgenda && (
                <Link className="text-link" to={sufixoAgenda()}>
                  Abrir agenda <ArrowRight size={14} strokeWidth={1.75} />
                </Link>
              )}
            </div>
            <div className="attention-grid">
              <Link to={podeAbrirAgenda ? sufixoAgenda("RESERVADO") : "/painel"} className={`attention-cell${dados.operacaoHoje.aguardandoConfirmacao > 0 ? " is-alert" : ""}`}>
                <span className="attention-label">Aguardando confirmação</span>
                <strong className="tabular">{dados.operacaoHoje.aguardandoConfirmacao}</strong>
                <small>Reservas de hoje pendentes</small>
              </Link>
              <Link to={podeAbrirAgenda ? sufixoAgenda("CONFIRMADO") : "/painel"} className={`attention-cell${dados.operacaoHoje.prontosParaConcluir > 0 ? " is-alert" : ""}`}>
                <span className="attention-label">Prontos para concluir</span>
                <strong className="tabular">{dados.operacaoHoje.prontosParaConcluir}</strong>
                <small>Horário encerrado hoje</small>
              </Link>
              <Link to={podeAbrirAgenda ? sufixoAgenda() : "/painel"} className="attention-cell">
                <span className="attention-label">Próximos hoje</span>
                <strong className="tabular">{dados.operacaoHoje.proximosHoje}</strong>
                <small>Ainda por atender</small>
              </Link>
              <Link to={podeAbrirAgenda ? sufixoAgenda("CANCELADO,FALTOU") : "/painel"} className="attention-cell">
                <span className="attention-label">Cancelados / faltas hoje</span>
                <strong className="tabular">{dados.operacaoHoje.canceladosOuFaltasHoje}</strong>
                <small>Ocorrências no dia</small>
              </Link>
              <Link to={podeExpediente ? "/expediente" : "/painel"} className="attention-cell">
                <span className="attention-label">Capacidade livre hoje</span>
                <strong className="tabular">{formatarMinutos(dados.operacaoHoje.minutosLivresHoje)}</strong>
                <small>De {formatarMinutos(dados.operacaoHoje.minutosDisponiveisHoje)} abertos</small>
              </Link>
            </div>
          </section>

          <section className="kpi-band kpi-band--mgmt" aria-label="Indicadores principais">
            <article className="kpi-cell">
              <div className="kpi-cell-top">
                <span>Valor dos serviços concluídos</span>
                <DollarSign size={15} strokeWidth={1.75} className="accent-icon" />
              </div>
              <strong className="display-metric tabular">{moeda(dados.indicadores.valorServicosConcluidos)}</strong>
              <BadgeComparacao variacao={dados.indicadores.compValorConcluidos} monetario />
              <small className="kpi-sub tabular">Previsto em aberto: {moeda(dados.indicadores.valorPrevistoAgendamentos)}</small>
            </article>

            <article className="kpi-cell">
              <div className="kpi-cell-top">
                <span>Atendimentos concluídos</span>
                <Scissors size={15} strokeWidth={1.75} className="accent-icon" />
              </div>
              <strong className="display-metric tabular">
                {dados.indicadores.concluidos}
                <span className="kpi-of"> / {dados.indicadores.totalAgendamentos}</span>
              </strong>
              <BadgeComparacao variacao={dados.indicadores.compConcluidos} />
              <small className="kpi-sub tabular">
                {dados.indicadores.confirmados + dados.indicadores.pendentes} em aberto · {dados.indicadores.cancelados + dados.indicadores.faltas} cancel./falta
              </small>
            </article>

            <article className="kpi-cell">
              <div className="kpi-cell-top">
                <span>Ticket médio concluído</span>
                <TrendingUp size={15} strokeWidth={1.75} className="accent-icon" />
              </div>
              <strong className="display-metric tabular">
                {dados.indicadores.ticketMedioConcluidos !== null ? moeda(dados.indicadores.ticketMedioConcluidos) : "—"}
              </strong>
              <span className="kpi-delta is-neutral tabular">
                {dados.indicadores.concluidosPagos} {dados.indicadores.concluidosPagos === 1 ? "serviço pago" : "serviços pagos"}
              </span>
              <small className="kpi-sub">
                {dados.indicadores.concluidosBeneficio > 0
                  ? `Exclui ${dados.indicadores.concluidosBeneficio} resgate(s) de fidelidade`
                  : "Média dos serviços concluídos pagos"}
              </small>
            </article>

            <article className="kpi-cell">
              <div className="kpi-cell-top">
                <span>Ocupação da agenda</span>
                <Clock3 size={15} strokeWidth={1.75} className="accent-icon" />
              </div>
              <strong className="display-metric tabular">
                {dados.indicadores.ocupacaoPercentual !== null ? `${dados.indicadores.ocupacaoPercentual.toFixed(1)}%` : "—"}
              </strong>
              <span className="kpi-delta is-neutral tabular">
                {formatarMinutos(dados.indicadores.minutosOcupados)} / {formatarMinutos(dados.indicadores.minutosDisponiveis)}
              </span>
              <small className="kpi-sub">
                {dados.contexto.periodoIncompleto && dados.indicadores.ocupacaoDecorridaPercentual !== null
                  ? `Até agora no período: ${dados.indicadores.ocupacaoDecorridaPercentual.toFixed(1)}% · `
                  : ""}
                {dados.indicadores.ocupacaoEstimadaHistorica
                  ? "Estimada pelo expediente semanal vigente"
                  : "Baseada nos expedientes e bloqueios ativos"}
              </small>
            </article>

            <article className="kpi-cell">
              <div className="kpi-cell-top">
                <span>Clientes atendidos</span>
                <UsersRound size={15} strokeWidth={1.75} className="accent-icon" />
              </div>
              <strong className="display-metric tabular">{dados.indicadores.clientesUnicosAtendidos}</strong>
              <BadgeComparacao variacao={dados.indicadores.compClientesUnicos} />
              <small className="kpi-sub tabular">
                {dados.indicadores.clientesRecorrentes} recorrente(s) · {dados.indicadores.novosCadastros} novo(s) cadastro(s)
              </small>
            </article>
          </section>

          <section className="mgmt-charts-row">
            <GraficoAtividadeTempo serie={dados.serieTemporal} />
            <GraficoValorConcluidos serie={dados.serieTemporal} />
          </section>

          <InsightsNegocioSection
            insights={dados.insights}
            limite={4}
            mostrarLinkTodos
            searchQuery={estado.searchQuery}
          />

          <MetasMensaisSection
            meta={dados.metaMes}
            onAtualizado={estado.recarregarAgora}
          />

          <section className="mgmt-bottom-grid">
            <article className="surface-card stack-sm">
              <div className="section-head">
                <div>
                  <h2>Agenda de hoje</h2>
                  <small className="text-secondary">Decisões pendentes e próximos horários em ordem de prioridade</small>
                </div>
                {podeAbrirAgenda && (
                  <Link className="text-link" to={sufixoAgenda()}>
                    Agenda completa <ArrowRight size={14} strokeWidth={1.75} />
                  </Link>
                )}
              </div>

              {dados.operacaoHoje.agendaHoje.length === 0 ? (
                <Vazio texto="Nenhum atendimento marcado para hoje." />
              ) : (
                <div className="mgmt-today-list">
                  {dados.operacaoHoje.agendaHoje.slice(0, 8).map(a => (
                    <div className="mgmt-today-row" key={a.id}>
                      <div className="feed-time tabular">
                        <strong>{hora(a.inicio)}</strong>
                        <small>{hora(a.fim)}</small>
                      </div>
                      <div className="feed-copy">
                        <strong>{a.cliente}</strong>
                        <small>{a.servico} · {a.barbeiro}</small>
                      </div>
                      <div className="mgmt-today-actions">
                        <span className={`status-pill status-pill--${a.status.toLowerCase()}`}>
                          <i className="status-dot" aria-hidden="true" />{statusTexto[a.status]}
                        </span>
                        {podeAlterarStatus && a.status === "RESERVADO" && (
                          <Botao compacto disabled={ocupadoId === a.id} onClick={() => void atualizarStatusHoje(a, "CONFIRMADO")}>
                            <Check size={13} strokeWidth={2} /> Confirmar
                          </Botao>
                        )}
                        {podeAlterarStatus && a.status === "CONFIRMADO" && instanteAgenda(a.fim) <= agora && (
                          <Botao compacto disabled={ocupadoId === a.id} onClick={() => void atualizarStatusHoje(a, "CONCLUIDO")}>
                            <Check size={13} strokeWidth={2} /> Concluir
                          </Botao>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <div className="stack">
              <article className="surface-card stack-sm">
                <div className="section-head">
                  <h2>Serviços mais solicitados</h2>
                  <Link className="text-link" to={`/desempenho${estado.searchQuery}`}>
                    <BarChart3 size={14} strokeWidth={1.75} /> Ver desempenho
                  </Link>
                </div>
                {dados.rankingServicos.length === 0 ? (
                  <Vazio texto="Sem solicitações de serviços neste período." />
                ) : (
                  <div className="mgmt-rank-list">
                    {dados.rankingServicos.slice(0, 5).map(s => (
                      <div className="mgmt-rank-row" key={s.servicoId}>
                        <div className="mgmt-rank-copy">
                          <strong>{s.nome}</strong>
                          <small className="tabular">{s.totalAgendamentos} reserv. · {s.concluidos} concl.</small>
                        </div>
                        <strong className="tabular">{moeda(s.valorConcluidos)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </article>

              <article className="surface-card stack-sm">
                <div className="section-head">
                  <div className="inline-title">
                    <Gift size={15} strokeWidth={1.75} className="accent-icon" />
                    <h2>Clientes e fidelidade</h2>
                  </div>
                  <div className="inline-actions">
                    {podeClientes && <Link className="text-link" to="/clientes">Clientes</Link>}
                    {podeFidelidade && <Link className="text-link" to="/fidelidade-programa">Configurar</Link>}
                  </div>
                </div>
                <div className="mgmt-loyalty-grid">
                  <div>
                    <span>1º atendimento</span>
                    <strong className="tabular">{dados.fidelidadeClientes.primeirosAtendimentos}</strong>
                  </div>
                  <div>
                    <span>Recorrentes</span>
                    <strong className="tabular">{dados.fidelidadeClientes.clientesRecorrentes}</strong>
                  </div>
                  <div>
                    <span>Com prêmio livre</span>
                    <strong className="tabular">{dados.fidelidadeClientes.clientesComRecompensaDisponivel}</strong>
                  </div>
                  <div>
                    <span>Prêmios resgatados</span>
                    <strong className="tabular">{dados.fidelidadeClientes.recompensasResgatadasNoPeriodo}</strong>
                  </div>
                </div>
                <small className="text-secondary">
                  {dados.fidelidadeClientes.programaAtivo
                    ? `Programa ativo (${dados.fidelidadeClientes.meta} atendimentos → ${dados.fidelidadeClientes.nomePremio ?? "Prêmio"}) · ${dados.fidelidadeClientes.participantesFidelidade} participante(s).`
                    : "Programa de fidelidade desativado no momento."}
                </small>
              </article>
            </div>
          </section>

          {dados.limitacoes.length > 0 && (
            <details className="surface-card mgmt-disclosure">
              <summary>
                <span className="inline-title">
                  <AlertCircle size={15} strokeWidth={1.75} className="accent-icon" />
                  <span>Definições e limitações dos dados exibidos ({dados.limitacoes.length})</span>
                </span>
              </summary>
              <div className="mgmt-disclosure-body">
                {dados.limitacoes.map(l => (
                  <div key={l.codigo}>
                    <strong>{l.titulo}</strong>
                    <p className="text-secondary">{l.detalhe}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
