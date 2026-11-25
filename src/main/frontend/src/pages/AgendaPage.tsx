import { useState } from "react";
import { CalendarDays, CalendarPlus, LayoutGrid, List, RefreshCw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useAgora } from "../services/useAgora";
import { Aviso, Campo, SkeletonList, Titulo, Vazio } from "../components/Interface";
import AgendamentoCard from "../components/AgendamentoCard";
import Semana, { somarDias } from "../components/Semana";
import { AnimatedValue } from "../motion/Primitives";
import { temPapel } from "../services/auth";
import { dataCurta, hoje, instanteAgenda, moeda, statusTexto } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import type { Agendamento, Barbeiro, Status } from "../types/Barbearia";

export default function AgendaPage({ equipe = false }: { equipe?: boolean }) {
  const agora = useAgora();
  const admin = temPapel("ADMIN");
  const barbeiroPerfil = equipe && !admin;
  const [params, setParams] = useSearchParams();
  const dia = params.get("data") ?? hoje();
  const [periodo, setPeriodo] = useState<"dia" | "semana">("dia");
  const [agrupamento, setAgrupamento] = useState<"lista" | "profissional">("lista");
  const [barbeiro, setBarbeiro] = useState("");
  const [filtro, setFiltro] = useState<"proximos" | "historico">("proximos");
  const [situacao, setSituacao] = useState<Status | "">("");
  const [sucesso, setSucesso] = useState("");

  const barbeiros = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const fimSemana = somarDias(dia, 6);
  const diasDaSemana = Array.from({ length: 7 }, (_, i) => somarDias(dia, i));

  const queryEquipe = new URLSearchParams({ data: dia });
  if (periodo === "semana") queryEquipe.set("ate", fimSemana);
  if (barbeiro) queryEquipe.set("barbeiroId", barbeiro);

  const agenda = useConsulta<Agendamento[]>(
    equipe ? `/agendamentos?${queryEquipe.toString()}` : "/agendamentos",
    equipe ? 5000 : 0
  );

  const visiveis = agenda.dados?.filter(a => {
    if (equipe) return !situacao || situacao === a.status;
    const futuro = (a.status === "RESERVADO" || a.status === "CONFIRMADO") && instanteAgenda(a.fim) > agora;
    return filtro === "proximos" ? futuro : !futuro;
  });

  const lista = !equipe && filtro === "proximos" ? visiveis?.toReversed() : visiveis;

  const receitaConcluida =
    lista
      ?.filter(a => a.status === "CONCLUIDO" && !a.beneficio)
      .reduce((acc, a) => acc + Number(a.preco || 0), 0) ?? 0;

  const receitaPrevista =
    lista
      ?.filter(a => (a.status === "RESERVADO" || a.status === "CONFIRMADO") && !a.beneficio)
      .reduce((acc, a) => acc + Number(a.preco || 0), 0) ?? 0;

  function selecionarDia(novaData: string) {
    setParams({ data: novaData });
    setSucesso("");
  }

  const porProfissional =
    equipe && agrupamento === "profissional" && lista
      ? Object.entries(
          lista.reduce<Record<string, Agendamento[]>>((mapa, a) => {
            (mapa[a.barbeiro] ??= []).push(a);
            return mapa;
          }, {})
        )
      : [];

  const porDiaSemana =
    equipe && periodo === "semana" && agrupamento === "lista" && lista
      ? diasDaSemana.map(d => {
          const itens = lista.filter(a => a.inicio.slice(0, 10) === d);
          const totalDia = itens
            .filter(a => a.status !== "CANCELADO" && a.status !== "FALTOU" && !a.beneficio)
            .reduce((acc, a) => acc + Number(a.preco || 0), 0);
          return { dia: d, itens, totalDia };
        })
      : [];

  const diasComAtendimentos = porDiaSemana.filter(g => g.itens.length > 0);

  return (
    <section className="stack">
      <Titulo
        eyebrow={barbeiroPerfil ? "Área do profissional" : equipe ? "Operação" : "Agenda pessoal"}
        titulo={barbeiroPerfil ? "Minha agenda" : equipe ? "Agenda" : "Meus horários"}
        detalhe={
          equipe
            ? periodo === "semana"
              ? `Semana de ${dataCurta(dia)} até ${dataCurta(fimSemana)}`
              : barbeiroPerfil
                ? "Seus atendimentos do dia atualizados automaticamente."
                : "Acompanhe e atualize os atendimentos em tempo real."
            : "Consulte suas reservas ativas e repita atendimentos anteriores."
        }
        acao={
          (!equipe || admin) && (
            <Link className="btn btn--primario" to="/agendar">
              <CalendarPlus size={17} /> {equipe ? "Nova reserva" : "Agendar"}
            </Link>
          )
        }
      />

      {equipe ? (
        <section className="surface-card stack-sm">
          <div className="agenda-toolbar">
            <div className="segmented" role="group" aria-label="Período da agenda">
              <button type="button" aria-pressed={periodo === "dia"} onClick={() => setPeriodo("dia")}>
                Diária
              </button>
              <button type="button" aria-pressed={periodo === "semana"} onClick={() => setPeriodo("semana")}>
                Semanal
              </button>
            </div>

            <div className="agenda-toolbar-right">
              {admin && (
                <div className="segmented" role="group" aria-label="Agrupamento">
                  <button type="button" aria-pressed={agrupamento === "lista"} onClick={() => setAgrupamento("lista")}>
                    <List size={14} /> Horário
                  </button>
                  <button
                    type="button"
                    aria-pressed={agrupamento === "profissional"}
                    onClick={() => setAgrupamento("profissional")}
                  >
                    <LayoutGrid size={14} /> Equipe
                  </button>
                </div>
              )}

              <button
                type="button"
                className="live-sync-pill"
                onClick={() => agenda.recarregar()}
                title="Atualizar agora"
              >
                <span className={`live-dot${agenda.desatualizado ? " is-stale" : ""}`} aria-hidden="true" />
                <span>{agenda.desatualizado ? "Reconectando" : "Ao vivo"}</span>
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          <Semana dia={dia} escolher={selecionarDia} permitirPassado />

          <div className="agenda-filters">
            {admin && (
              <Campo nome="Profissional">
                <select value={barbeiro} onChange={e => { setBarbeiro(e.target.value); setSucesso(""); }}>
                  <option value="">Todos os profissionais</option>
                  {barbeiros.dados?.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </Campo>
            )}

            <div className="field">
              <label>Status</label>
              <div className="chip-scroll" role="group" aria-label="Filtrar por situação">
                <button type="button" className="chip" aria-pressed={situacao === ""} onClick={() => setSituacao("")}>
                  Todos
                </button>
                {(Object.entries(statusTexto) as [Status, string][]).map(([chave, nome]) => (
                  <button
                    type="button"
                    key={chave}
                    className="chip"
                    aria-pressed={situacao === chave}
                    onClick={() => setSituacao(chave)}
                  >
                    {nome}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <div className="segmented" role="group" aria-label="Filtrar horários">
          <button type="button" aria-pressed={filtro === "proximos"} onClick={() => setFiltro("proximos")}>
            Próximos
          </button>
          <button type="button" aria-pressed={filtro === "historico"} onClick={() => setFiltro("historico")}>
            Histórico
          </button>
        </div>
      )}

      {equipe && lista && lista.length > 0 && (
        <div className="agenda-kpi-strip" aria-label="Resumo do período">
          <div className="kpi-chip">
            <strong><AnimatedValue value={lista.length} format={n => String(Math.round(n))} /></strong>
            <span>Total</span>
          </div>
          <div className="kpi-chip">
            <strong>
              <AnimatedValue value={lista.filter(a => a.status === "RESERVADO").length} format={n => String(Math.round(n))} />
            </strong>
            <span>A confirmar</span>
          </div>
          <div className="kpi-chip">
            <strong>
              <AnimatedValue value={lista.filter(a => a.status === "CONFIRMADO").length} format={n => String(Math.round(n))} />
            </strong>
            <span>Confirmados</span>
          </div>
          <div className="kpi-chip">
            <strong>
              <AnimatedValue value={lista.filter(a => a.status === "CONCLUIDO").length} format={n => String(Math.round(n))} />
            </strong>
            <span>Concluídos</span>
          </div>
          <div className="kpi-chip kpi-chip--accent">
            <strong><AnimatedValue value={receitaConcluida} format={moeda} /></strong>
            <span>Realizado</span>
          </div>
          <div className="kpi-chip">
            <strong><AnimatedValue value={receitaPrevista} format={moeda} /></strong>
            <span>Previsto</span>
          </div>
        </div>
      )}

      {equipe && periodo === "semana" && agrupamento === "lista" && porDiaSemana.length > 0 && (
        <div className="week-overview-strip" aria-label="Distribuição semanal">
          {porDiaSemana.map(g => (
            <button
              key={g.dia}
              type="button"
              className={`week-overview-cell${g.itens.length > 0 ? " has-items" : ""}${g.dia === dia ? " is-anchor" : ""}`}
              onClick={() => {
                setPeriodo("dia");
                selecionarDia(g.dia);
              }}
            >
              <span className="week-overview-day">{dataCurta(g.dia)}</span>
              <strong className="tabular">{g.itens.length}</strong>
              <small>{g.itens.length === 1 ? "horário" : "horários"}</small>
            </button>
          ))}
        </div>
      )}

      <Aviso erro={agenda.erro || barbeiros.erro} />
      <Aviso sucesso={sucesso} />
      {agenda.carregando && <SkeletonList quantidade={4} />}

      {!agenda.carregando && lista?.length === 0 && (
        <Vazio
          texto={
            equipe
              ? "Nenhum atendimento encontrado para os filtros selecionados."
              : filtro === "proximos"
                ? "Você não tem horários futuros agendados."
                : "Seu histórico de atendimentos ainda está vazio."
          }
          acao={
            !equipe && filtro === "proximos" ? (
              <Link to="/agendar" className="btn btn--primario btn--compacto">Agendar horário</Link>
            ) : undefined
          }
        />
      )}

      {equipe && agrupamento === "profissional" && porProfissional.length > 0 ? (
        <div className="barber-columns">
          {porProfissional.map(([nomeBarbeiro, itens]) => (
            <section key={nomeBarbeiro} className="barber-column">
              <div className="barber-column-head">
                <h2>{nomeBarbeiro}</h2>
                <span className="meta-chip tabular">{itens.length}</span>
              </div>
              <div className="stack-sm">
                {itens.map(a => (
                  <AgendamentoCard
                    key={a.id}
                    a={a}
                    equipe={equipe}
                    podeTrocarProfissional={!equipe || admin}
                    barbeiros={barbeiros.dados ?? []}
                    recarregar={msg => { setSucesso(msg); agenda.recarregar(); }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : equipe && periodo === "semana" && diasComAtendimentos.length > 0 ? (
        <div className="week-day-groups">
          {diasComAtendimentos.map(g => (
            <section key={g.dia} className="week-day-section">
              <header className="week-day-header">
                <div className="inline-title">
                  <CalendarDays size={16} className="accent-icon" />
                  <h2>{dataCurta(g.dia)}</h2>
                  <span className="meta-chip tabular">
                    {g.itens.length} {g.itens.length === 1 ? "atendimento" : "atendimentos"}
                  </span>
                </div>
                <strong className="week-day-total tabular">{moeda(g.totalDia)}</strong>
              </header>
              <div className="appt-grid">
                {g.itens.map(a => (
                  <AgendamentoCard
                    key={a.id}
                    a={a}
                    equipe={equipe}
                    podeTrocarProfissional={!equipe || admin}
                    barbeiros={barbeiros.dados ?? []}
                    recarregar={msg => { setSucesso(msg); agenda.recarregar(); }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        !!lista?.length && (
          <div className="appt-grid">
            {lista.map(a => (
              <AgendamentoCard
                key={a.id}
                a={a}
                equipe={equipe}
                podeTrocarProfissional={!equipe || admin}
                barbeiros={barbeiros.dados ?? []}
                recarregar={msg => { setSucesso(msg); agenda.recarregar(); }}
              />
            ))}
          </div>
        )
      )}
    </section>
  );
}
