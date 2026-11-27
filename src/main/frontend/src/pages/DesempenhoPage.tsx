import { AlertCircle, ArrowLeft, CalendarDays, FileText, Gift, Scissors, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import FiltrosPainel from "../components/FiltrosPainel";
import { InsightsNegocioSection } from "../components/InsightsNegocioSection";
import { MetasMensaisSection } from "../components/MetasMensaisSection";
import { formatarMinutos, usePainelGestao } from "../services/usePainel";
import {
  GraficoAtividadeTempo, GraficoDistribuicaoStatus, GraficoValorConcluidos, MapaDemandaSemanal,
} from "../components/GraficosGestao";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import { temAlgumaPermissao, temPermissao } from "../services/auth";
import { moeda } from "../services/formato";

export default function DesempenhoPage() {
  const estado = usePainelGestao();
  const dados = estado.resumo.dados;
  const podeClientes = temAlgumaPermissao("CLIENTES_GERENCIAR", "FIDELIDADE_ADMINISTRAR");
  const podeFidelidade = temPermissao("FIDELIDADE_ADMINISTRAR");

  return (
    <div className="dashboard stack">
      <Titulo
        eyebrow="Gestão do negócio"
        titulo="Desempenho"
        detalhe={dados
          ? `${dados.contexto.rotuloPeriodo}${dados.contexto.barbeiroNome ? ` · ${dados.contexto.barbeiroNome}` : ""}`
          : "Análise de serviços, profissionais, demanda horária, clientes e fidelidade."}
        acao={
          <Link to={`/painel${estado.searchQuery}`} className="btn btn--neutro btn--compacto">
            <ArrowLeft size={15} strokeWidth={1.75} /> Visão geral
          </Link>
        }
      />

      <FiltrosPainel estado={estado} />

      <Aviso erro={estado.resumo.erro} aoTentarNovamente={estado.resumo.erro ? estado.recarregarAgora : undefined} />
      {estado.resumo.carregando && <SkeletonList quantidade={4} />}

      {dados && (
        <>
          <section className="kpi-band kpi-band--mgmt" aria-label="Indicadores de desempenho">
            <article className="kpi-cell">
              <div className="kpi-cell-top"><span>Taxa de comparecimento</span><CalendarDays size={15} strokeWidth={1.75} className="accent-icon" /></div>
              <strong className="display-metric tabular">
                {dados.indicadores.taxaComparecimento !== null ? `${dados.indicadores.taxaComparecimento.toFixed(1)}%` : "—"}
              </strong>
              <small className="kpi-sub tabular">
                {dados.indicadores.concluidos} concluídos vs {dados.indicadores.faltas} falta(s)
              </small>
            </article>
            <article className="kpi-cell">
              <div className="kpi-cell-top"><span>Cancelamentos e faltas</span><Scissors size={15} strokeWidth={1.75} className="accent-icon" /></div>
              <strong className="display-metric tabular">
                {dados.indicadores.taxaCancelamento !== null ? `${dados.indicadores.taxaCancelamento.toFixed(1)}%` : "—"}
              </strong>
              <small className="kpi-sub tabular">
                {dados.indicadores.cancelados} cancel. · {dados.indicadores.faltas} falta(s)
              </small>
            </article>
            <article className="kpi-cell">
              <div className="kpi-cell-top"><span>Bloqueios no período</span><UsersRound size={15} strokeWidth={1.75} className="accent-icon" /></div>
              <strong className="display-metric tabular">{formatarMinutos(dados.indicadores.minutosBloqueados)}</strong>
              <small className="kpi-sub tabular">
                Capacidade líquida: {formatarMinutos(dados.indicadores.minutosDisponiveis)}
              </small>
            </article>
            <article className="kpi-cell">
              <div className="kpi-cell-top"><span>Comparação equivalente</span><Gift size={15} strokeWidth={1.75} className="accent-icon" /></div>
              <strong className="display-metric tabular">
                {dados.indicadores.compValorConcluidos.comparavel && dados.indicadores.compValorConcluidos.deltaPercentual !== null
                  ? `${dados.indicadores.compValorConcluidos.deltaPercentual >= 0 ? "+" : ""}${dados.indicadores.compValorConcluidos.deltaPercentual.toFixed(1)}%`
                  : "—"}
              </strong>
              <small className="kpi-sub">{dados.contexto.rotuloComparacao}</small>
            </article>
          </section>

          <section className="surface-card summary-narrative" aria-label="Seu negócio neste período">
            <div className="summary-narrative-head">
              <div className="inline-title">
                <FileText size={16} strokeWidth={1.75} className="accent-icon" aria-hidden="true" />
                <h2>Seu negócio neste período</h2>
              </div>
              <span className="meta-chip">{dados.contexto.rotuloPeriodo}</span>
            </div>
            <p className="summary-headline">{dados.resumoPeriodo.manchete}</p>
            <div className="summary-bullets">
              {dados.resumoPeriodo.resultadosPrincipais.map((r, i) => (
                <span key={i} className="meta-chip">{r}</span>
              ))}
            </div>
            <p className="text-secondary">{dados.resumoPeriodo.comparacaoAnterior}</p>
            <p className="text-secondary">{dados.resumoPeriodo.resumoMetas}</p>
            <div className="summary-cols">
              <div className="summary-col">
                <h3>Destaques positivos</h3>
                <ul>
                  {dados.resumoPeriodo.destaquesPositivos.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
              <div className="summary-col">
                <h3>Pontos de atenção</h3>
                <ul>
                  {dados.resumoPeriodo.pontosAtencao.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            </div>
            <div className="summary-priorities">
              <h3>Prioridades sugeridas</h3>
              <ol>
                {dados.resumoPeriodo.prioridadesSugeridas.map((pr, i) => <li key={i}>{pr}</li>)}
              </ol>
            </div>
          </section>

          <MetasMensaisSection meta={dados.metaMes} mostrarHistorico onAtualizado={estado.recarregarAgora} />

          <InsightsNegocioSection insights={dados.insights} />

          <section className="mgmt-charts-row">
            <GraficoDistribuicaoStatus itens={dados.distribuicaoStatus} total={dados.indicadores.totalAgendamentos} />
            <GraficoValorConcluidos serie={dados.serieTemporal} />
          </section>

          <GraficoAtividadeTempo serie={dados.serieTemporal} />

          <section className="surface-card stack-sm">
            <div className="section-head">
              <div>
                <h2>Serviços mais solicitados</h2>
                <small className="text-secondary">
                  Diferencia total de agendamentos, atendimentos concluídos e resgates de fidelidade sem valor monetário.
                </small>
              </div>
              <span className="meta-chip tabular">{dados.rankingServicos.length} serviço(s)</span>
            </div>
            {dados.rankingServicos.length === 0 ? (
              <Vazio texto="Nenhum serviço agendado neste período." />
            ) : (
              <div className="mgmt-table-wrap">
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th>Serviço</th>
                      <th>Agendados</th>
                      <th>Concluídos</th>
                      <th>Fidelidade</th>
                      <th>Cancel./Falta</th>
                      <th>Participação</th>
                      <th>Valor / hora</th>
                      <th>Valor concluído</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.rankingServicos.map(s => (
                      <tr key={s.servicoId}>
                        <td data-label="Serviço"><strong>{s.nome}</strong></td>
                        <td data-label="Agendados" className="tabular">{s.totalAgendamentos}</td>
                        <td data-label="Concluídos" className="tabular">{s.concluidos}</td>
                        <td data-label="Fidelidade" className="tabular">{s.concluidosBeneficio}</td>
                        <td data-label="Cancel./Falta" className="tabular">{s.canceladosOuFaltas}</td>
                        <td data-label="Participação" className="tabular">{s.participacaoPercentual.toFixed(1)}%</td>
                        <td data-label="Valor / hora" className="tabular">{s.valorPorHora !== null ? moeda(s.valorPorHora) : "—"}</td>
                        <td data-label="Valor concluído" className="tabular"><strong>{moeda(s.valorConcluidos)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="surface-card stack-sm">
            <div className="section-head">
              <div>
                <h2>Desempenho por profissional</h2>
                <small className="text-secondary">
                  Avalie atendimentos e valores sempre em conjunto com a disponibilidade real (expediente menos bloqueios).
                </small>
              </div>
              <span className="meta-chip tabular">{dados.desempenhoProfissionais.length} profissional(is)</span>
            </div>
            {dados.desempenhoProfissionais.length === 0 ? (
              <Vazio texto="Nenhum profissional com disponibilidade ou atendimentos neste período." />
            ) : (
              <div className="mgmt-table-wrap">
                <table className="mgmt-table">
                  <thead>
                    <tr>
                      <th>Profissional</th>
                      <th>Concluídos</th>
                      <th>Em aberto</th>
                      <th>Carga ocupada</th>
                      <th>Disponível</th>
                      <th>Ocupação</th>
                      <th>Ticket médio</th>
                      <th>Valor concluído</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.desempenhoProfissionais.map(p => (
                      <tr key={p.barbeiroId}>
                        <td data-label="Profissional">
                          <div className="stack-2xs">
                            <strong>{p.nome}{p.ativo ? "" : " (Inativo)"}</strong>
                            <small className="text-secondary">{p.observacaoDisponibilidade}</small>
                          </div>
                        </td>
                        <td data-label="Concluídos" className="tabular">{p.concluidos} / {p.totalAgendamentos}</td>
                        <td data-label="Em aberto" className="tabular">{p.pendentesOuConfirmados}</td>
                        <td data-label="Carga ocupada" className="tabular">{formatarMinutos(p.minutosAgendados)}</td>
                        <td data-label="Disponível" className="tabular">{formatarMinutos(p.minutosDisponiveis)}</td>
                        <td data-label="Ocupação" className="tabular">{p.ocupacaoPercentual !== null ? `${p.ocupacaoPercentual.toFixed(1)}%` : "—"}</td>
                        <td data-label="Ticket médio" className="tabular">{p.ticketMedio !== null ? moeda(p.ticketMedio) : "—"}</td>
                        <td data-label="Valor concluído" className="tabular"><strong>{moeda(p.valorConcluidos)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <MapaDemandaSemanal celulas={dados.mapaDemanda} />

          <section className="surface-card stack-sm">
            <div className="section-head">
              <div>
                <h2>Clientes e programa de fidelidade</h2>
                <small className="text-secondary">
                  Recorrência contabiliza clientes atendidos no período com 2 ou mais atendimentos concluídos até a data final.
                </small>
              </div>
              <div className="inline-actions">
                {podeClientes && <Link className="btn btn--neutro btn--compacto" to="/clientes">Ver clientes</Link>}
                {podeFidelidade && <Link className="btn btn--neutro btn--compacto" to="/fidelidade-programa">Regras</Link>}
              </div>
            </div>
            <div className="mgmt-loyalty-band">
              <div className="mgmt-loyalty-stat"><span>Novos cadastros no período</span><strong className="tabular">{dados.fidelidadeClientes.novosCadastros}</strong></div>
              <div className="mgmt-loyalty-stat"><span>Clientes únicos atendidos</span><strong className="tabular">{dados.fidelidadeClientes.clientesUnicosAtendidos}</strong></div>
              <div className="mgmt-loyalty-stat"><span>Primeiro atendimento</span><strong className="tabular">{dados.fidelidadeClientes.primeirosAtendimentos}</strong></div>
              <div className="mgmt-loyalty-stat"><span>Clientes recorrentes</span><strong className="tabular">{dados.fidelidadeClientes.clientesRecorrentes}</strong></div>
              <div className="mgmt-loyalty-stat"><span>Com recompensa disponível</span><strong className="tabular">{dados.fidelidadeClientes.clientesComRecompensaDisponivel}</strong></div>
              <div className="mgmt-loyalty-stat"><span>Recompensas resgatadas</span><strong className="tabular">{dados.fidelidadeClientes.recompensasResgatadasNoPeriodo}</strong></div>
              <div className="mgmt-loyalty-stat"><span>Créditos emitidos</span><strong className="tabular">{dados.fidelidadeClientes.creditosEmitidosNoPeriodo}</strong></div>
              <div className="mgmt-loyalty-stat"><span>Participantes totais</span><strong className="tabular">{dados.fidelidadeClientes.participantesFidelidade}</strong></div>
            </div>
          </section>

          <section className="surface-card stack-sm">
            <div className="inline-title">
              <AlertCircle size={16} strokeWidth={1.75} className="accent-icon" />
              <h2>Metodologia e transparência</h2>
            </div>
            <p className="text-secondary">{dados.contexto.metodologiaComparacao}</p>
            {dados.limitacoes.map(l => (
              <div key={l.codigo} className="mgmt-limit-item">
                <strong>{l.titulo}</strong>
                <p className="text-secondary">{l.detalhe}</p>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
