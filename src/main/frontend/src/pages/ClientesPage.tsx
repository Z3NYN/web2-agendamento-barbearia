import { useState } from "react";
import { ArrowLeft, ArrowUpDown, CalendarClock, Gift, Scissors, Search, Sparkles, UserCheck } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import { temAlgumaPermissao, temPermissao } from "../services/auth";
import { compararInicioDesc, data, dataHora, iniciais, moeda, statusTexto } from "../services/formato";
import { CartaoFidelidade } from "./FidelidadePage";
import type { Agendamento, Cartao } from "../types/Barbearia";
import type { ClienteRetencao, OrdenacaoRetencao, PainelRetencao, StatusRetencao } from "../types/Retencao";
import type { Usuario } from "../types/Usuario";

const STATUS_VALIDOS: ReadonlySet<StatusRetencao> = new Set([
  "RETORNO_ATRASADO",
  "AGENDAMENTO_FUTURO",
  "RETORNO_ESPERADO",
  "CLIENTE_RECORRENTE",
  "CLIENTE_NOVO",
  "HISTORICO_INSUFICIENTE",
]);

function classeStatusRetencao(s: StatusRetencao): string {
  switch (s) {
    case "RETORNO_ATRASADO":
      return "retention-pill--atrasado";
    case "AGENDAMENTO_FUTURO":
      return "retention-pill--futuro";
    case "RETORNO_ESPERADO":
      return "retention-pill--esperado";
    case "CLIENTE_RECORRENTE":
      return "retention-pill--recorrente";
    case "CLIENTE_NOVO":
      return "retention-pill--novo";
    default:
      return "retention-pill--insuficiente";
  }
}

function RetencaoBadge({ status, rotulo }: { status: StatusRetencao; rotulo: string }) {
  return (
    <span className={`retention-pill ${classeStatusRetencao(status)}`}>
      {rotulo}
    </span>
  );
}

export function ClientesPage() {
  const podeRetencao = temPermissao("CLIENTES_GERENCIAR");
  const [params, setParams] = useSearchParams();
  const statusUrl = params.get("status");
  const filtroStatus: StatusRetencao | "" = statusUrl && STATUS_VALIDOS.has(statusUrl as StatusRetencao)
    ? (statusUrl as StatusRetencao)
    : "";
  const [busca, setBusca] = useState("");
  const [ordenar, setOrdenar] = useState<OrdenacaoRetencao>("ATRASO");

  const queryRetencao = new URLSearchParams({ ordenar });
  if (busca.trim()) queryRetencao.set("busca", busca.trim());
  if (filtroStatus) queryRetencao.set("status", filtroStatus);

  const retencao = useConsulta<PainelRetencao>(
    podeRetencao ? `/clientes/retencao?${queryRetencao.toString()}` : null
  );
  const simples = useConsulta<Usuario[]>(!podeRetencao ? "/usuarios/clientes" : null);

  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const clientesSimples = simples.dados?.filter(
    u => !busca.trim() || norm(u.nome + " " + u.email + " " + u.username).includes(norm(busca.trim()))
  );

  function selecionarStatus(novo: StatusRetencao | "") {
    const proximo = new URLSearchParams(params);
    if (!novo) proximo.delete("status");
    else proximo.set("status", novo);
    setParams(proximo, { replace: true });
  }

  if (!podeRetencao) {
    return (
      <section className="stack">
        <Titulo eyebrow="Gestão" titulo="Clientes" detalhe="Consulte cadastro, histórico de atendimentos e cartão fidelidade." />
        <div className="admin-toolbar-row">
          <label className="search-pill"><Search size={16} strokeWidth={1.75} /><input type="search" aria-label="Buscar clientes" placeholder="Buscar por nome, usuário ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} /></label>
          {clientesSimples && <span className="meta-chip tabular">{clientesSimples.length} {clientesSimples.length === 1 ? "cliente" : "clientes"}</span>}
        </div>
        <Aviso erro={simples.erro} aoTentarNovamente={simples.erro ? simples.recarregar : undefined} />
        {simples.carregando && <SkeletonList quantidade={4} />}
        {!simples.carregando && clientesSimples?.length === 0 && <Vazio texto="Nenhum cliente encontrado." />}
        {Boolean(clientesSimples?.length) && (
          <div className="admin-table-shell">
            <div className="admin-table-head" aria-hidden="true"><span>Cliente</span><span>Usuário</span><span>Status</span><span className="admin-table-head-actions">Ações</span></div>
            <div className="admin-table-body">
              {clientesSimples?.map(c => (
                <div className="admin-table-row" key={c.id}>
                  <div className="admin-row-primary">
                    <div className="avatar-sm" aria-hidden="true">{iniciais(c.nome)}</div>
                    <div className="list-copy"><h3>{c.nome}</h3><p className="text-secondary">{c.email}</p></div>
                  </div>
                  <div className="admin-row-metrics">
                    <div className="admin-metric-cell"><small className="admin-metric-label">Usuário</small><span className="text-secondary">@{c.username}</span></div>
                    <div className="admin-metric-cell"><small className="admin-metric-label">Status</small><span className={`status-pill ${c.ativo ? "status-pill--confirmado" : "status-pill--cancelado"}`}><i className="status-dot" aria-hidden="true" />{c.ativo ? "Ativo" : "Inativo"}</span></div>
                  </div>
                  <div className="admin-row-actions"><Link className="btn btn--neutro btn--compacto" to={`/clientes/${c.id}`}>Ver ficha</Link></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  const dados = retencao.dados;
  const c = dados?.resumo;

  return (
    <section className="stack">
      <Titulo
        eyebrow="Retenção e relacionamento"
        titulo="Clientes"
        detalhe="Acompanhe frequência real, intervalo habitual de retorno, clientes atrasados e histórico individual."
      />

      {c && (
        <div className="chip-group retention-chips" role="group" aria-label="Filtrar clientes por retenção">
          <button type="button" className="chip" aria-pressed={filtroStatus === ""} onClick={() => selecionarStatus("")}>
            Todos ({c.totalClientes})
          </button>
          <button type="button" className="chip" aria-pressed={filtroStatus === "RETORNO_ATRASADO"} onClick={() => selecionarStatus("RETORNO_ATRASADO")}>
            Retorno atrasado ({c.atrasados})
          </button>
          <button type="button" className="chip" aria-pressed={filtroStatus === "AGENDAMENTO_FUTURO"} onClick={() => selecionarStatus("AGENDAMENTO_FUTURO")}>
            Agendamento futuro ({c.agendamentoFuturo})
          </button>
          <button type="button" className="chip" aria-pressed={filtroStatus === "RETORNO_ESPERADO"} onClick={() => selecionarStatus("RETORNO_ESPERADO")}>
            Retorno esperado ({c.retornoEsperado})
          </button>
          <button type="button" className="chip" aria-pressed={filtroStatus === "CLIENTE_RECORRENTE"} onClick={() => selecionarStatus("CLIENTE_RECORRENTE")}>
            Recorrentes ({c.recorrentes})
          </button>
          <button type="button" className="chip" aria-pressed={filtroStatus === "CLIENTE_NOVO"} onClick={() => selecionarStatus("CLIENTE_NOVO")}>
            Novos ({c.novos})
          </button>
          <button type="button" className="chip" aria-pressed={filtroStatus === "HISTORICO_INSUFICIENTE"} onClick={() => selecionarStatus("HISTORICO_INSUFICIENTE")}>
            Histórico reduzido ({c.historicoInsuficiente})
          </button>
        </div>
      )}

      <div className="admin-toolbar-row retention-toolbar">
        <label className="search-pill">
          <Search size={16} strokeWidth={1.75} />
          <input
            type="search"
            aria-label="Buscar clientes"
            placeholder="Buscar por nome, usuário ou e-mail"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </label>

        <div className="retention-toolbar-right">
          <label className="mgmt-inline-select" aria-label="Ordenar clientes">
            <ArrowUpDown size={14} strokeWidth={1.75} aria-hidden="true" />
            <select value={ordenar} onChange={e => setOrdenar(e.target.value as OrdenacaoRetencao)}>
              <option value="ATRASO">Prioridade de retorno</option>
              <option value="ULTIMO_ATENDIMENTO">Último atendimento</option>
              <option value="VALOR">Maior valor concluído</option>
              <option value="VISITAS">Mais visitas concluídas</option>
              <option value="NOME">Ordem alfabética</option>
            </select>
          </label>
          {dados && (
            <span className="meta-chip tabular">
              {dados.clientes.length} {dados.clientes.length === 1 ? "cliente" : "clientes"}
            </span>
          )}
        </div>
      </div>

      <Aviso erro={retencao.erro} aoTentarNovamente={retencao.erro ? retencao.recarregar : undefined} />
      {retencao.carregando && <SkeletonList quantidade={4} />}
      {!retencao.carregando && dados?.clientes.length === 0 && <Vazio texto="Nenhum cliente encontrado com os filtros atuais." />}

      {Boolean(dados?.clientes.length) && (
        <div className="retention-list">
          {dados?.clientes.map(cli => (
            <article className="surface-card retention-row" key={cli.id}>
              <div className="retention-row-main">
                <div className="avatar-sm" aria-hidden="true">{iniciais(cli.nome)}</div>
                <div className="retention-identity">
                  <div className="retention-title-line">
                    <h3>{cli.nome}</h3>
                    <RetencaoBadge status={cli.statusRetencao} rotulo={cli.rotuloStatus} />
                    {cli.recompensasDisponiveis !== null && cli.recompensasDisponiveis > 0 && (
                      <span className="retention-reward-chip">
                        <Gift size={12} aria-hidden="true" />
                        <span>{cli.recompensasDisponiveis} prêmio(s)</span>
                      </span>
                    )}
                  </div>
                  <p className="text-secondary">{cli.email} · @{cli.username}</p>
                  <p className="retention-explanation">{cli.explicacaoStatus}</p>
                </div>
              </div>

              <div className="retention-metrics">
                <div className="retention-metric">
                  <small>Última visita</small>
                  <strong className="tabular">
                    {cli.ultimoAtendimento ? `${data(cli.ultimoAtendimento)} (${cli.diasDesdeUltimo}d)` : "Sem concluídos"}
                  </strong>
                </div>
                <div className="retention-metric">
                  <small>Frequência</small>
                  <strong className="tabular">
                    {cli.totalConcluidos} concl.
                    {cli.intervaloHabitualDias !== null ? ` · a cada ${cli.intervaloHabitualDias}d` : ""}
                  </strong>
                </div>
                <div className="retention-metric">
                  <small>Preferência</small>
                  <strong>
                    {cli.servicoMaisFrequente ?? "—"}
                    {cli.profissionalMaisFrequente ? ` · ${cli.profissionalMaisFrequente}` : ""}
                  </strong>
                </div>
                <div className="retention-metric">
                  <small>Total concluído</small>
                  <strong className="tabular">{moeda(cli.valorTotalConcluidos)}</strong>
                </div>
              </div>

              <div className="retention-row-action">
                <Link className="btn btn--neutro btn--compacto" to={`/clientes/${cli.id}`}>Ver ficha</Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function ClientePage() {
  const { id } = useParams();
  const podeRetencao = temPermissao("CLIENTES_GERENCIAR");
  const podeVerDados = temAlgumaPermissao("CLIENTES_GERENCIAR", "FIDELIDADE_ADMINISTRAR");
  const podeVerHistorico = temAlgumaPermissao("CLIENTES_GERENCIAR", "AGENDAMENTOS_GERENCIAR", "FIDELIDADE_ADMINISTRAR");
  const podeVerFidelidade = temPermissao("FIDELIDADE_ADMINISTRAR");
  const c = useConsulta<Usuario>(podeVerDados && id ? `/usuarios/clientes/${id}` : null);
  const retencao = useConsulta<ClienteRetencao>(podeRetencao && id ? `/clientes/retencao/${id}` : null);
  const cartao = useConsulta<Cartao>(podeVerFidelidade && id ? `/fidelidade/${id}` : null);
  const agenda = useConsulta<Agendamento[]>(podeVerHistorico && id ? `/agendamentos/cliente/${id}` : null);
  const historicoOrdenado = agenda.dados?.toSorted(compararInicioDesc);

  const ind = retencao.dados;

  return (
    <section className="stack">
      <Titulo
        eyebrow="Ficha do cliente"
        titulo={c.dados?.nome ?? "Cliente"}
        detalhe={c.dados?.email}
        acao={<Link className="btn btn--neutro btn--compacto" to="/clientes"><ArrowLeft size={15} strokeWidth={1.75} /> Clientes</Link>}
      />
      <Aviso
        erro={c.erro || retencao.erro || cartao.erro || agenda.erro}
        aoTentarNovamente={c.erro ? c.recarregar : retencao.erro ? retencao.recarregar : agenda.erro ? agenda.recarregar : cartao.erro ? cartao.recarregar : undefined}
      />
      {(c.carregando || retencao.carregando || cartao.carregando || agenda.carregando) && <SkeletonList quantidade={3} />}

      {ind && (
        <section className="surface-card stack-sm" aria-label="Retenção e comportamento">
          <div className="section-head">
            <div className="inline-title">
              <Sparkles size={16} strokeWidth={1.75} className="accent-icon" aria-hidden="true" />
              <h2>Retenção e frequência</h2>
            </div>
            <RetencaoBadge status={ind.statusRetencao} rotulo={ind.rotuloStatus} />
          </div>

          <p>{ind.explicacaoStatus}</p>

          <div className="retention-detail-grid">
            <div className="retention-detail-box">
              <span className="inline-title"><CalendarClock size={14} aria-hidden="true" /> Último atendimento</span>
              <strong className="tabular">
                {ind.ultimoAtendimento ? `${dataHora(ind.ultimoAtendimento)} (${ind.diasDesdeUltimo} dia(s))` : "Nenhum concluído"}
              </strong>
            </div>
            <div className="retention-detail-box">
              <span className="inline-title"><UserCheck size={14} aria-hidden="true" /> Intervalo habitual</span>
              <strong className="tabular">
                {ind.intervaloHabitualDias !== null
                  ? `${ind.intervaloHabitualDias} dia(s) · alerta após ${ind.limiteEsperaDias} dia(s)`
                  : `${ind.totalConcluidos} atendimento(s) concluído(s)`}
              </strong>
            </div>
            <div className="retention-detail-box">
              <span className="inline-title"><Scissors size={14} aria-hidden="true" /> Preferência</span>
              <strong>
                {ind.servicoMaisFrequente ?? "Sem padrão"}
                {ind.profissionalMaisFrequente ? ` · ${ind.profissionalMaisFrequente}` : ""}
              </strong>
            </div>
            <div className="retention-detail-box">
              <span className="inline-title"><Gift size={14} aria-hidden="true" /> Valor e benefícios</span>
              <strong className="tabular">
                {moeda(ind.valorTotalConcluidos)}
                {ind.recompensasDisponiveis !== null ? ` · ${ind.recompensasDisponiveis} prêmio(s)` : ""}
              </strong>
            </div>
          </div>

          {ind.proximoAgendamento && (
            <p className="text-secondary tabular">
              Próximo horário futuro marcado: <strong>{dataHora(ind.proximoAgendamento)}</strong>.
            </p>
          )}
        </section>
      )}

      {historicoOrdenado && (
        <section className="surface-card stack-sm">
          <h2>Histórico de atendimentos</h2>
          {historicoOrdenado.length === 0 && <Vazio texto="Nenhum atendimento registrado." />}
          {historicoOrdenado.length > 0 && (
            <div className="list-panel">
              {historicoOrdenado.map(a => (
                <div className="list-row" key={a.id}>
                  <div className="list-copy"><strong>{a.servico}</strong><p className="text-secondary tabular">{dataHora(a.inicio)} · {a.barbeiro}</p></div>
                  <span className={`status-pill status-pill--${a.status.toLowerCase()}`}><i className="status-dot" aria-hidden="true" />{statusTexto[a.status]}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {cartao.dados && <CartaoFidelidade cartao={cartao.dados} cliente={false} />}
    </section>
  );
}
