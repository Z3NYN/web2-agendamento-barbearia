import { useState } from "react";
import { moeda } from "../services/formato";
import { formatarMinutos } from "../services/usePainel";
import type { CelulaDemanda, ItemStatus, PontoSerie } from "../types/Painel";

function VazioGrafico({ texto }: { texto: string }) {
  return <div className="mgmt-chart-empty">{texto}</div>;
}

export function GraficoAtividadeTempo({ serie }: { serie: PontoSerie[] }) {
  const [modoTabela, setModoTabela] = useState(false);
  const [ativoIdx, setAtivoIdx] = useState<number>();

  const temDados = serie.some(p => p.total > 0);
  const maxValor = Math.max(1, ...serie.map(p => p.total));
  const ativo = ativoIdx !== undefined ? serie[ativoIdx] : undefined;
  const passoRotulo = serie.length > 14 ? Math.ceil(serie.length / 7) : serie.length > 8 ? 2 : 1;

  const width = 620;
  const height = 210;
  const padL = 32;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const slotW = serie.length > 0 ? plotW / serie.length : plotW;
  const barW = Math.max(4, Math.min(26, slotW * 0.62));

  return (
    <article className="surface-card chart-card">
      <div className="chart-head">
        <div>
          <h2>Atividade de agendamentos</h2>
          <small>Concluídos, em aberto (reservados/confirmados) e cancelamentos/faltas</small>
        </div>
        {temDados && (
          <button type="button" className="btn btn--fantasma btn--compacto" onClick={() => setModoTabela(v => !v)}>
            {modoTabela ? "Ver gráfico" : "Ver tabela"}
          </button>
        )}
      </div>

      {!temDados ? (
        <VazioGrafico texto="Sem agendamentos registrados neste período para exibir a evolução." />
      ) : modoTabela ? (
        <div className="mgmt-mini-table-wrap">
          <table className="mgmt-mini-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Total</th>
                <th>Concluídos</th>
                <th>Em aberto</th>
                <th>Cancel./Falta</th>
              </tr>
            </thead>
            <tbody>
              {serie.map(p => (
                <tr key={p.rotulo + p.inicio}>
                  <td>{p.rotulo}</td>
                  <td className="tabular">{p.total}</td>
                  <td className="tabular">{p.concluidos}</td>
                  <td className="tabular">{p.confirmados + p.pendentes}</td>
                  <td className="tabular">{p.cancelados + p.faltas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="chart-svg-wrap">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="chart-svg"
              role="img"
              aria-label="Gráfico de barras de atividade de agendamentos ao longo do período"
            >
              {[0, 0.5, 1].map(frac => {
                const y = padT + plotH - frac * plotH;
                const val = Math.round(maxValor * frac);
                return (
                  <g key={frac}>
                    <line x1={padL} y1={y} x2={width - padR} y2={y} className="chart-grid-line" />
                    <text x={padL - 6} y={y + 3} textAnchor="end" className="chart-axis-text">{val}</text>
                  </g>
                );
              })}
              {serie.map((p, i) => {
                const x = padL + i * slotW + (slotW - barW) / 2;
                const hConc = (p.concluidos / maxValor) * plotH;
                const hAberto = ((p.confirmados + p.pendentes) / maxValor) * plotH;
                const hPerda = ((p.cancelados + p.faltas) / maxValor) * plotH;
                const yConc = padT + plotH - hConc;
                const yAberto = yConc - hAberto;
                const yPerda = yAberto - hPerda;
                return (
                  <g
                    key={p.rotulo + p.inicio}
                    className={`chart-bar-group${ativoIdx === i ? " is-active" : ""}`}
                    onMouseEnter={() => setAtivoIdx(i)}
                    onMouseLeave={() => setAtivoIdx(undefined)}
                    onClick={() => setAtivoIdx(prev => (prev === i ? undefined : i))}
                  >
                    <rect x={padL + i * slotW} y={padT} width={slotW} height={plotH} fill="transparent" />
                    {hConc > 0 && <rect x={x} y={yConc} width={barW} height={hConc} rx={2} className="bar-concluido" />}
                    {hAberto > 0 && <rect x={x} y={yAberto} width={barW} height={hAberto} rx={2} className="bar-aberto" />}
                    {hPerda > 0 && <rect x={x} y={yPerda} width={barW} height={hPerda} rx={2} className="bar-perda" />}
                    {(i % passoRotulo === 0 || i === serie.length - 1) && (
                      <text x={padL + i * slotW + slotW / 2} y={height - 8} textAnchor="middle" className="chart-axis-text">
                        {p.rotulo}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="chart-foot">
            <div className="chart-legend">
              <span><i className="legend-dot bar-concluido" /> Concluídos</span>
              <span><i className="legend-dot bar-aberto" /> Em aberto</span>
              <span><i className="legend-dot bar-perda" /> Cancelados / faltas</span>
            </div>
            <div className="chart-readout tabular">
              {ativo
                ? `${ativo.rotulo}: ${ativo.total} total · ${ativo.concluidos} concl. · ${ativo.confirmados + ativo.pendentes} abertos · ${ativo.cancelados + ativo.faltas} cancel./falta`
                : "Toque ou passe o cursor sobre uma barra para detalhar"}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

export function GraficoValorConcluidos({ serie }: { serie: PontoSerie[] }) {
  const [modoTabela, setModoTabela] = useState(false);
  const [ativoIdx, setAtivoIdx] = useState<number>();

  const temDados = serie.some(p => p.valorConcluidos > 0 || p.valorPrevisto > 0);
  const maxValor = Math.max(10, ...serie.map(p => Math.max(p.valorConcluidos, p.valorPrevisto)));
  const ativo = ativoIdx !== undefined ? serie[ativoIdx] : undefined;
  const passoRotulo = serie.length > 14 ? Math.ceil(serie.length / 7) : serie.length > 8 ? 2 : 1;

  const width = 620;
  const height = 210;
  const padL = 56;
  const padR = 14;
  const padT = 16;
  const padB = 28;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const divisor = Math.max(1, serie.length - 1);

  const pontos = serie.map((p, i) => {
    const x = padL + (serie.length === 1 ? plotW / 2 : (i / divisor) * plotW);
    const y = padT + plotH - (p.valorConcluidos / maxValor) * plotH;
    return { x, y, p };
  });

  const linePath = pontos.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(" ");
  const areaPath = pontos.length > 1
    ? `${linePath} L${pontos[pontos.length - 1].x.toFixed(1)},${padT + plotH} L${pontos[0].x.toFixed(1)},${padT + plotH} Z`
    : "";

  return (
    <article className="surface-card chart-card">
      <div className="chart-head">
        <div>
          <h2>Valor dos serviços concluídos</h2>
          <small>Evolução pelos valores gravados nos atendimentos concluídos</small>
        </div>
        {temDados && (
          <button type="button" className="btn btn--fantasma btn--compacto" onClick={() => setModoTabela(v => !v)}>
            {modoTabela ? "Ver gráfico" : "Ver tabela"}
          </button>
        )}
      </div>

      {!temDados ? (
        <VazioGrafico texto="Nenhum valor de serviço concluído ou previsto neste período." />
      ) : modoTabela ? (
        <div className="mgmt-mini-table-wrap">
          <table className="mgmt-mini-table">
            <thead>
              <tr>
                <th>Período</th>
                <th>Concluído</th>
                <th>Previsto</th>
              </tr>
            </thead>
            <tbody>
              {serie.map(p => (
                <tr key={p.rotulo + p.inicio}>
                  <td>{p.rotulo}</td>
                  <td className="tabular">{moeda(p.valorConcluidos)}</td>
                  <td className="tabular">{moeda(p.valorPrevisto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="chart-svg-wrap">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="chart-svg"
              role="img"
              aria-label="Gráfico de evolução do valor dos serviços concluídos"
            >
              {[0, 0.5, 1].map(frac => {
                const y = padT + plotH - frac * plotH;
                const val = maxValor * frac;
                return (
                  <g key={frac}>
                    <line x1={padL} y1={y} x2={width - padR} y2={y} className="chart-grid-line" />
                    <text x={padL - 6} y={y + 3} textAnchor="end" className="chart-axis-text">
                      {val >= 1000 ? `R$${(val / 1000).toFixed(1)}k` : `R$${Math.round(val)}`}
                    </text>
                  </g>
                );
              })}
              {areaPath && <path d={areaPath} className="chart-area-fill" />}
              {pontos.length > 1 && <path d={linePath} className="chart-line-stroke" fill="none" />}
              {pontos.map((pt, i) => (
                <g
                  key={pt.p.rotulo + pt.p.inicio}
                  onMouseEnter={() => setAtivoIdx(i)}
                  onMouseLeave={() => setAtivoIdx(undefined)}
                  onClick={() => setAtivoIdx(prev => (prev === i ? undefined : i))}
                >
                  <circle cx={pt.x} cy={pt.y} r={12} fill="transparent" />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={ativoIdx === i ? 5 : pt.p.valorConcluidos > 0 ? 3.2 : 2}
                    className={ativoIdx === i ? "chart-dot is-active" : "chart-dot"}
                  />
                  {(i % passoRotulo === 0 || i === pontos.length - 1) && (
                    <text x={pt.x} y={height - 8} textAnchor="middle" className="chart-axis-text">
                      {pt.p.rotulo}
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>
          <div className="chart-foot">
            <div className="chart-legend">
              <span><i className="legend-dot bar-concluido" /> Concluídos</span>
            </div>
            <div className="chart-readout tabular">
              {ativo
                ? `${ativo.rotulo}: ${moeda(ativo.valorConcluidos)} concluídos${ativo.valorPrevisto > 0 ? ` · ${moeda(ativo.valorPrevisto)} previstos` : ""}`
                : "Toque ou passe o cursor sobre um ponto para detalhar"}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

export function GraficoDistribuicaoStatus({ itens, total }: { itens: ItemStatus[]; total: number }) {
  const corClasse: Record<string, string> = {
    CONCLUIDO: "seg-concluido",
    CONFIRMADO: "seg-confirmado",
    RESERVADO: "seg-reservado",
    CANCELADO: "seg-cancelado",
    FALTOU: "seg-faltou",
  };

  if (total === 0) {
    return (
      <article className="surface-card chart-card">
        <div className="chart-head">
          <div>
            <h2>Distribuição por status</h2>
            <small>Composição completa dos agendamentos no período</small>
          </div>
        </div>
        <VazioGrafico texto="Nenhum agendamento registrado no período selecionado." />
      </article>
    );
  }

  return (
    <article className="surface-card chart-card">
      <div className="chart-head">
        <div>
          <h2>Distribuição por status</h2>
          <small className="tabular">{total} {total === 1 ? "agendamento" : "agendamentos"} no período</small>
        </div>
      </div>

      <div className="status-seg-bar" role="img" aria-label="Barra proporcional por status">
        {itens.filter(i => i.quantidade > 0).map(i => (
          <span
            key={i.status}
            className={corClasse[i.status] ?? "seg-concluido"}
            style={{ width: `${Math.max(2, i.percentual)}%` }}
            title={`${i.rotulo}: ${i.quantidade} (${i.percentual}%)`}
          />
        ))}
      </div>

      <div className="status-dist-list">
        {itens.map(i => (
          <div className="status-dist-row" key={i.status}>
            <div className="inline-title">
              <i className={`legend-dot ${corClasse[i.status] ?? "seg-concluido"}`} aria-hidden="true" />
              <span>{i.rotulo}</span>
            </div>
            <div className="status-dist-nums tabular">
              <strong>{i.quantidade}</strong>
              <span>{i.percentual.toFixed(1)}%</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

const DIAS_ORDEM = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function MapaDemandaSemanal({ celulas }: { celulas: CelulaDemanda[] }) {
  const [selecionada, setSelecionada] = useState<CelulaDemanda>();

  const faixas = Array.from(new Set(celulas.map(c => c.horaInicio))).sort((a, b) => a - b);
  const mapa = new Map(celulas.map(c => [`${c.diaSemana}|${c.horaInicio}`, c]));
  const diasCabecalho = DIAS_ORDEM.map(d => celulas.find(c => c.diaSemana === d)?.rotuloDia ?? d.slice(0, 3));

  const textoNivel: Record<CelulaDemanda["nivel"], string> = {
    FECHADO: "Fechado",
    DADOS_INSUFICIENTES: "Dados insuficientes",
    BAIXA: "Demanda baixa",
    MEDIA: "Demanda média",
    ALTA: "Demanda alta",
  };

  return (
    <article className="surface-card chart-card">
      <div className="chart-head">
        <div>
          <h2>Demanda por dia e faixa horária</h2>
          <small>Horários fechados são separados da disponibilidade aberta para não distorcer períodos ociosos.</small>
        </div>
      </div>

      {faixas.length === 0 ? (
        <VazioGrafico texto="Sem grade horária configurada para mapear demanda." />
      ) : (
        <>
          <div className="demand-matrix" role="table" aria-label="Demanda semanal por faixa horária">
            <div className="demand-row demand-row--head" role="row">
              <span className="demand-corner" role="columnheader">Faixa</span>
              {diasCabecalho.map((rotulo, idx) => (
                <span key={DIAS_ORDEM[idx]} className="demand-col-head" role="columnheader">{rotulo}</span>
              ))}
            </div>
            {faixas.map(h => {
              const faixaLabel = celulas.find(c => c.horaInicio === h)?.rotuloFaixa ?? `${String(h).padStart(2, "0")}h`;
              return (
                <div className="demand-row" role="row" key={h}>
                  <span className="demand-time tabular" role="rowheader">{faixaLabel}</span>
                  {DIAS_ORDEM.map(dia => {
                    const cel = mapa.get(`${dia}|${h}`);
                    if (!cel) return <span key={dia} className="demand-cell is-fechado" />;
                    const classe = `demand-cell is-${cel.nivel.toLowerCase().replace("_", "-")}${selecionada === cel ? " is-selected" : ""}`;
                    const titulo = `${cel.rotuloDia} ${cel.rotuloFaixa} — ${textoNivel[cel.nivel]}${cel.minutosDisponiveis > 0 ? ` (${cel.atendimentos} atend., ${cel.ocupacaoPercentual ?? 0}% ocupação)` : ""}`;
                    return (
                      <button
                        key={dia}
                        type="button"
                        role="cell"
                        className={classe}
                        title={titulo}
                        aria-label={titulo}
                        onClick={() => setSelecionada(cel)}
                      >
                        <span className="tabular">
                          {cel.nivel === "FECHADO"
                            ? "—"
                            : cel.nivel === "DADOS_INSUFICIENTES" && cel.atendimentos === 0
                              ? "·"
                              : cel.atendimentos}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div className="chart-foot">
            <div className="chart-legend">
              <span><i className="legend-dot demand-dot-alta" /> Alta (&ge;65%)</span>
              <span><i className="legend-dot demand-dot-media" /> Média (25–64%)</span>
              <span><i className="legend-dot demand-dot-baixa" /> Baixa (&lt;25%)</span>
              <span><i className="legend-dot demand-dot-insuf" /> Poucos dados</span>
              <span><i className="legend-dot demand-dot-fechado" /> Fechado</span>
            </div>
            <div className="chart-readout tabular">
              {selecionada
                ? `${selecionada.rotuloDia} ${selecionada.rotuloFaixa}: ${textoNivel[selecionada.nivel]} · ${selecionada.minutosDisponiveis > 0 ? `${selecionada.atendimentos} atend. · ${formatarMinutos(selecionada.minutosOcupados)} / ${formatarMinutos(selecionada.minutosDisponiveis)} (${selecionada.ocupacaoPercentual ?? 0}%)` : "sem expediente aberto"}`
                : "Toque em uma célula para ver ocupação e capacidade aberta"}
            </div>
          </div>
        </>
      )}
    </article>
  );
}
