import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarCheck2, Check, Clock3, Gift, LogIn, RefreshCw, UsersRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { data, dataHora, dataHoraCurta, dataIsoValida, hoje, hora, mensagem, moeda, statusTexto } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import { obterSessao, temPapel } from "../services/auth";
import { Aviso, Campo, SkeletonList, SkeletonSlots, Titulo, Vazio } from "../components/Interface";
import Botao from "../components/Botao";
import { FotoEditorial } from "../components/Experiencia";
import { useFotos } from "../components/FotosPublicas";
import { useMarca } from "../components/useMarca";
import Semana, { somarDias } from "../components/Semana";
import { AnimatedValue } from "../motion/Primitives";
import { useMotionPrefs } from "../motion/useMotion";
import { fotoProfissional, fotoServico } from "../services/fotosDemo";
import type { Agendamento, Barbeiro, Cartao, Servico, SlotHorario } from "../types/Barbearia";
import type { Usuario } from "../types/Usuario";

const etapas = ["Serviço", "Profissional", "Data e hora", "Revisão"];
const titulos = ["Escolha o serviço", "Escolha o profissional", "Escolha data e horário", "Revise sua reserva"];
const qualquer = "qualquer";
const periodos = ["Manhã", "Tarde", "Noite"];
const CHAVE_PENDENTE = "studio-agendamento-pendente";

function periodoDe(h: string) {
  const horas = Number(h.slice(11, 13));
  return horas < 12 ? "Manhã" : horas < 18 ? "Tarde" : "Noite";
}

const isoHorario = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::00)?$/;

function dataNoIntervalo(valor: string | null) {
  const atual = hoje();
  const limite = somarDias(atual, 90);
  const valida = dataIsoValida(valor, atual);
  return valida >= atual && valida <= limite ? valida : atual;
}

export default function AgendarPage() {
  const [params] = useSearchParams();
  const sessao = obterSessao();
  const admin = temPapel("ADMIN");
  const clienteLogado = temPapel("CLIENTE");

  const inicial = (() => {
    const salvoRaw = sessionStorage.getItem(CHAVE_PENDENTE);
    let salvo: Record<string, string> = {};
    if (salvoRaw) { try { salvo = JSON.parse(salvoRaw) as Record<string, string>; } catch { salvo = {}; } }
    const srv = params.get("servico") ?? salvo.servico ?? "";
    const prof = params.get("profissional") ?? salvo.profissional ?? "";
    const d = dataNoIntervalo(params.get("dia") ?? salvo.dia ?? null);
    const hRaw = params.get("horario") ?? salvo.horario ?? "";
    const h = hRaw && isoHorario.test(hRaw) && hRaw.startsWith(d) ? hRaw : "";
    const prem = params.get("premio") ?? salvo.premio ?? "";
    return { srv, prof, d, h, prem };
  })();

  const [servico, setServico] = useState(inicial.srv);
  const [barbeiro, setBarbeiro] = useState(inicial.prof || qualquer);
  const [dia, setDia] = useState(inicial.d);
  const [horario, setHorario] = useState(inicial.h);
  const [periodo, setPeriodo] = useState(() => (inicial.h ? periodoDe(inicial.h) : ""));
  const [cliente, setCliente] = useState("");
  const [premio, setPremio] = useState(inicial.prem);
  const [confirmouPagoSemPremio, setConfirmouPagoSemPremio] = useState(false);
  const [etapa, setEtapa] = useState(() => {
    if (admin) return 0;
    if (inicial.srv && inicial.prof && inicial.h) return 3;
    if (inicial.srv && inicial.prof) return 2;
    if (inicial.srv) return 1;
    return 0;
  });
  const [sentido, setSentido] = useState("frente");
  const [saindoEtapa, setSaindoEtapa] = useState(false);
  const [versao, setVersao] = useState(0);
  const [reserva, setReserva] = useState<Agendamento>();
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const enviando = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const focar = useRef(false);
  const timerEtapa = useRef<number | undefined>(undefined);
  const { reduced } = useMotionPrefs();

  useEffect(() => () => window.clearTimeout(timerEtapa.current), []);

  const fotos = useFotos();
  const { marca } = useMarca();
  const servicos = useConsulta<Servico[]>("/publico/servicos");
  const barbeiros = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const clientes = useConsulta<Usuario[]>(admin ? "/usuarios" : null);
  const cartao = useConsulta<Cartao>(admin ? (cliente ? `/fidelidade/${cliente}` : null) : clienteLogado ? "/fidelidade" : null);

  const beneficios = cartao.dados?.historico.filter(
    m => m.tipo === "RECOMPENSA" && !m.agendamentoId && !m.resgatadoEm && m.servicoId?.toString() === servico
  ) ?? [];

  const selecionado = servicos.dados?.find(s => String(s.id) === servico);
  const profissional = barbeiros.dados?.find(b => String(b.id) === barbeiro);
  const profissionalValido = barbeiro === qualquer || Boolean(profissional);

  const filtro = new URLSearchParams({ servicoId: servico });
  if (profissional) filtro.set("barbeiroId", String(profissional.id));

  const consultar = etapa >= 2 && Boolean(selecionado) && profissionalValido;
  const grade = useConsulta<SlotHorario[]>(consultar ? `/publico/grade-horarios?${filtro}&data=${dia}&v=${versao}` : null);
  const fallbackLivres = useConsulta<string[]>(consultar && Boolean(grade.erro) ? `/publico/horarios?${filtro}&data=${dia}&v=${versao}` : null);

  const slots: SlotHorario[] | undefined = grade.dados ? grade.dados : fallbackLivres.dados?.map(h => ({ horario: h, disponivel: true }));
  const carregandoHorarios = grade.carregando || (Boolean(grade.erro) && fallbackLivres.carregando);
  const erroHorarios = grade.erro && !fallbackLivres.dados ? fallbackLivres.erro : undefined;
  const livres = slots?.filter(s => s.disponivel).map(s => s.horario);
  const temIndisponiveis = Boolean(slots?.some(s => !s.disponivel));

  const sugestoes = useConsulta<string[]>(consultar && livres?.length === 0 ? `/publico/proximos-horarios?${filtro}&aPartir=${somarDias(dia, 1)}&v=${versao}` : null);
  const periodosAbertos = periodos.filter(p => slots?.some(s => periodoDe(s.horario) === p));
  const periodoAtual = periodosAbertos.includes(periodo) ? periodo : periodosAbertos[0];
  const slotsExibidos = slots?.filter(s => !periodoAtual || periodoDe(s.horario) === periodoAtual);
  const horarioValido = Boolean(horario && livres?.includes(horario));

  // Proteção rigorosa: erro de consulta ou recompensa indisponível exige consentimento explícito antes de cobrar
  const precisaVerificarPremio = Boolean(premio && sessao && (clienteLogado || (admin && cliente)));
  const usandoPremio = Boolean(precisaVerificarPremio && cartao.dados && beneficios.some(b => String(b.id) === premio));
  const premioErroConsulta = Boolean(precisaVerificarPremio && !cartao.carregando && cartao.erro);
  const premioIndisponivel = Boolean(precisaVerificarPremio && !cartao.carregando && !cartao.erro && !usandoPremio);
  const exigeConsentimentoPago = premioErroConsulta || premioIndisponivel;
  const bloqueadoPorPremio = Boolean(precisaVerificarPremio && !usandoPremio && (cartao.carregando || !confirmouPagoSemPremio));

  const pronto = [Boolean(selecionado && (!admin || cliente)), profissionalValido, horarioValido];
  const progressoEtapaPct = ((etapa + 1) / etapas.length) * 100;

  useEffect(() => { setConfirmouPagoSemPremio(false); }, [premio, servico, cliente, cartao.dados, cartao.erro]);

  useEffect(() => {
    if (!focar.current) return;
    titulo.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [etapa, reserva]);

  function irPara(destino: number) {
    if (destino === etapa || saindoEtapa) return;
    focar.current = true;
    setSentido(destino < etapa ? "volta" : "frente");
    if (reduced) { setEtapa(destino); return; }
    setSaindoEtapa(true);
    window.clearTimeout(timerEtapa.current);
    timerEtapa.current = window.setTimeout(() => {
      setSaindoEtapa(false);
      setEtapa(destino);
    }, 140);
  }

  function escolherDia(d: string) {
    const seguro = dataNoIntervalo(d);
    if (dia !== seguro) { setDia(seguro); setHorario(""); setErro(""); }
  }

  function preservarAntesDoLogin() {
    sessionStorage.setItem(CHAVE_PENDENTE, JSON.stringify({ servico, profissional: barbeiro, dia, horario, premio }));
  }

  async function agendar(e: FormEvent) {
    e.preventDefault();
    if (etapa !== 3 || !sessao || !horarioValido || !selecionado || !profissionalValido || (admin && !cliente) || bloqueadoPorPremio || enviando.current) return;
    enviando.current = true;
    setOcupado(true);
    setErro("");
    try {
      const { data: resultado } = await api.post<Agendamento>("/agendamentos", {
        servicoId: selecionado.id,
        barbeiroId: profissional?.id ?? null,
        inicio: horario,
        clienteId: admin ? Number(cliente) : null,
        premioId: usandoPremio ? Number(premio) : null,
      });
      sessionStorage.removeItem(CHAVE_PENDENTE);
      focar.current = true;
      setReserva(resultado);
    } catch (err) {
      setErro(mensagem(err));
      setHorario("");
      setVersao(v => v + 1);
      irPara(2);
    } finally {
      enviando.current = false;
      setOcupado(false);
    }
  }

  if (sessao && !admin && !clienteLogado) return <Vazio texto="Use uma conta de cliente para reservar um horário." />;

  if (reserva) {
    const jaConfirmado = reserva.status === "CONFIRMADO";
    return (
      <section className="confirmation-wrap">
        <div className="surface-card confirmation-card">
          <div className="confirmation-badge"><CalendarCheck2 size={26} strokeWidth={1.75} /></div>
          <span className={`status-pill status-pill--${reserva.status.toLowerCase()}`}>
            <i className="status-dot" aria-hidden="true" />{statusTexto[reserva.status]}
          </span>
          <h1 tabIndex={-1} ref={titulo}>{jaConfirmado ? "Atendimento confirmado" : "Reserva registrada"}</h1>
          <p className="text-secondary">
            {jaConfirmado ? "Seu horário está confirmado na agenda da barbearia." : "Seu horário foi registrado na agenda e aguarda confirmação da barbearia."}
          </p>
          <div className="ticket-box">
            <div className="ticket-row"><span>Serviço</span><strong>{reserva.servico}</strong></div>
            <div className="ticket-row"><span>Profissional</span><strong>{reserva.barbeiro}</strong></div>
            <div className="ticket-row"><span>Data e horário</span><strong className="tabular">{dataHora(reserva.inicio)} ({hora(reserva.inicio)} – {hora(reserva.fim)})</strong></div>
            <div className="ticket-row"><span>Status atual</span><strong>{statusTexto[reserva.status]}</strong></div>
            <div className="ticket-row ticket-row--total"><span>Total</span><strong className="price-value tabular">{reserva.beneficio ? "Recompensa (R$ 0,00)" : moeda(reserva.preco)}</strong></div>
          </div>
          <div className="confirmation-actions">
            <Link className="btn btn--primario btn--full" to={admin ? `/agenda?data=${reserva.inicio.slice(0, 10)}` : "/meus-horarios"}>
              {admin ? "Ver na agenda" : "Ver meus horários"} <ArrowRight size={16} strokeWidth={1.9} />
            </Link>
            <Link className="text-link" to="/inicio"><ArrowLeft size={15} strokeWidth={1.75} /> Voltar ao início</Link>
          </div>
        </div>
      </section>
    );
  }

  const retorno = new URLSearchParams({ servico, profissional: barbeiro, dia, horario });
  if (premio) retorno.set("premio", premio);
  const precoNumerico = selecionado ? (usandoPremio ? 0 : Number(selecionado.preco)) : null;

  return (
    <div className="booking-page">
      <Titulo eyebrow={admin ? "Recepção" : "Agendamento"} titulo={admin ? "Nova reserva" : "Agende seu horário"} />

      <div className="stepper-wrap">
        <div className="stepper-progress" aria-hidden="true"><span style={{ width: `${progressoEtapaPct}%` }} /></div>
        <ol className="stepper" aria-label="Etapas do agendamento">
          {etapas.map((nome, i) => (
            <li key={nome} className={i < etapa ? "is-done" : i === etapa ? "is-current" : ""}>
              <button type="button" disabled={i > etapa || ocupado} aria-current={i === etapa ? "step" : undefined} onClick={() => irPara(i)}>
                <span className="stepper-dot">{i < etapa ? <Check size={13} strokeWidth={2.5} /> : i + 1}</span>
                <small>{nome}</small>
              </button>
            </li>
          ))}
        </ol>
      </div>

      <form className={`booking-layout${etapa === 3 ? " booking-layout--review" : ""}`} onSubmit={agendar} id="form-agendamento">
        <div className="booking-stage-viewport">
          <section className={`surface-card booking-stage${saindoEtapa ? " is-exiting" : ""}`} key={etapa} data-sentido={sentido} data-etapa={etapa}>
            <div className="booking-stage-head">
              <h2 tabIndex={-1} ref={titulo}>{titulos[etapa]}</h2>
              {etapa === 2 && selecionado && <span className="meta-chip tabular mobile-only-context">{selecionado.nome} · {selecionado.duracaoMinutos} min</span>}
            </div>

            <Aviso erro={erro || servicos.erro || barbeiros.erro || clientes.erro}
              aoTentarNovamente={servicos.erro ? servicos.recarregar : barbeiros.erro ? barbeiros.recarregar : clientes.erro ? clientes.recarregar : undefined} />

            {etapa === 0 && (
              <div className="stack-sm">
                {admin && (
                  <Campo nome="Cliente">
                    <select value={cliente} required onChange={e => { setCliente(e.target.value); setPremio(""); }}>
                      <option value="">Selecione o cliente</option>
                      {clientes.dados?.filter(c => c.ativo && c.permissoes.some(p => p.nome === "CLIENTE")).map(c => <option key={c.id} value={c.id}>{c.nome} ({c.username})</option>)}
                    </select>
                  </Campo>
                )}
                {servicos.carregando && <SkeletonList quantidade={3} />}
                {!servicos.carregando && servicos.dados?.length === 0 && <Vazio texto="Nenhum serviço disponível." />}
                {!!servicos.dados?.length && (
                  <fieldset className="option-list" aria-label="Serviços">
                    {servicos.dados.map(s => {
                      const ativo = servico === String(s.id);
                      return (
                        <label key={s.id} className={`option-card${ativo ? " is-selected" : ""}`}>
                          <input type="radio" name="servico" value={s.id} checked={ativo} onChange={() => { setServico(String(s.id)); setHorario(""); setPremio(""); }} />
                          <FotoEditorial src={fotoServico(fotos.dados, s, marca?.demonstracao)} alt={s.nome} className="option-thumb" />
                          <span className="option-copy">
                            <strong>{s.nome}</strong>
                            {s.descricao && <small className="option-desc">{s.descricao}</small>}
                            <small className="option-meta tabular">{s.duracaoMinutos} min · {moeda(s.preco)}</small>
                          </span>
                          <span className="option-check" aria-hidden="true">{ativo && <Check size={14} strokeWidth={2.8} />}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                )}
              </div>
            )}

            {etapa === 1 && (
              <div className="stack-sm">
                {barbeiros.carregando && <SkeletonList quantidade={3} />}
                {!barbeiros.carregando && barbeiros.dados?.length === 0 && <Vazio texto="Nenhum profissional disponível." />}
                {!!barbeiros.dados?.length && (
                  <fieldset className="option-list" aria-label="Profissionais">
                    <label className={`option-card${barbeiro === qualquer ? " is-selected" : ""}`}>
                      <input type="radio" name="profissional" value={qualquer} checked={barbeiro === qualquer} onChange={() => { setBarbeiro(qualquer); setHorario(""); }} />
                      <span className="option-thumb option-thumb--icon"><UsersRound size={19} strokeWidth={1.75} /></span>
                      <span className="option-copy">
                        <strong>Qualquer profissional disponível</strong>
                        <small className="option-desc">Mostra todos os horários abertos da equipe</small>
                      </span>
                      <span className="option-check" aria-hidden="true">{barbeiro === qualquer && <Check size={14} strokeWidth={2.8} />}</span>
                    </label>
                    {barbeiros.dados.map(b => {
                      const ativo = barbeiro === String(b.id);
                      return (
                        <label className={`option-card${ativo ? " is-selected" : ""}`} key={b.id}>
                          <input type="radio" name="profissional" value={b.id} checked={ativo} onChange={() => { setBarbeiro(String(b.id)); setHorario(""); }} />
                          <FotoEditorial src={fotoProfissional(fotos.dados, b, marca?.demonstracao)} alt={b.nome} className="option-thumb option-thumb--portrait" />
                          <span className="option-copy">
                            <strong>{b.nome}</strong>
                            {b.descricao && <small className="option-desc">{b.descricao}</small>}
                          </span>
                          <span className="option-check" aria-hidden="true">{ativo && <Check size={14} strokeWidth={2.8} />}</span>
                        </label>
                      );
                    })}
                  </fieldset>
                )}
              </div>
            )}

            {etapa === 2 && (
              <div className="stack-sm">
                {profissional && (
                  <div className="selected-barber-pill mobile-only-context">
                    <FotoEditorial src={fotoProfissional(fotos.dados, profissional, marca?.demonstracao)} alt={profissional.nome} className="selected-barber-avatar" />
                    <div className="selected-barber-copy"><strong>{profissional.nome}</strong>{profissional.descricao && <small>{profissional.descricao}</small>}</div>
                  </div>
                )}
                <Semana key={dia.slice(0, 7)} dia={dia} escolher={escolherDia} />
                <fieldset className="slots-fieldset">
                  <div className="slots-head">
                    <legend>Horários em {data(dia)}</legend>
                    {temIndisponiveis && (
                      <div className="slot-legend" aria-hidden="true">
                        <span><i className="dot dot--free" /> Livre</span>
                        <span><i className="dot dot--busy" /> Ocupado</span>
                        <span><i className="dot dot--picked" /> Selecionado</span>
                      </div>
                    )}
                  </div>
                  <Aviso erro={erroHorarios} aoTentarNovamente={erroHorarios ? () => setVersao(v => v + 1) : undefined} />
                  {carregandoHorarios && <SkeletonSlots quantidade={12} />}
                  {!carregandoHorarios && periodosAbertos.length > 1 && (
                    <div className="segmented" role="group" aria-label="Filtrar horários por período">
                      {periodosAbertos.map(p => <button type="button" key={p} aria-pressed={p === periodoAtual} onClick={() => setPeriodo(p)}>{p}</button>)}
                    </div>
                  )}
                  {!carregandoHorarios && !!slotsExibidos?.length && (
                    <div className="time-grid">
                      {slotsExibidos.map(slot => (
                        <label key={slot.horario} className={`time-slot${!slot.disponivel ? " time-slot--unavailable" : ""}`}>
                          <input type="radio" name="horario" value={slot.horario} disabled={!slot.disponivel} checked={slot.disponivel && horario === slot.horario} onChange={() => setHorario(slot.horario)} />
                          <span className="tabular">{hora(slot.horario)}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {!carregandoHorarios && livres?.length === 0 && (
                    <div className="no-slots-box">
                      <p className="text-secondary">Sem horários livres em {data(dia)}.</p>
                      <Aviso erro={sugestoes.erro} />
                      {sugestoes.carregando && <SkeletonSlots quantidade={4} />}
                      {!!sugestoes.dados?.length && (
                        <div className="stack-xs">
                          <small className="eyebrow">Próximos disponíveis</small>
                          <div className="quick-slots">
                            {sugestoes.dados.map(h => (
                              <button type="button" className="slot-link tabular" key={h} onClick={() => { setDia(h.slice(0, 10)); setHorario(h); setPeriodo(periodoDe(h)); setErro(""); }}>
                                {dataHoraCurta(h)}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {sugestoes.dados?.length === 0 && <small className="text-secondary">Tente outra semana ou selecione qualquer profissional.</small>}
                    </div>
                  )}
                </fieldset>
              </div>
            )}

            {etapa === 3 && (
              <div className="stack-sm">
                <div className="review-box">
                  {selecionado && (
                    <div className="review-service">
                      <FotoEditorial src={fotoServico(fotos.dados, selecionado, marca?.demonstracao)} alt={selecionado.nome} className="option-thumb" />
                      <div className="review-service-copy"><strong>{selecionado.nome}</strong><small className="text-secondary tabular">{selecionado.duracaoMinutos} min</small></div>
                    </div>
                  )}
                  <div className="ticket-row"><span>Profissional</span><strong>{barbeiro === qualquer ? "Qualquer disponível" : profissional?.nome ?? "—"}</strong></div>
                  <div className="ticket-row"><span>Data e horário</span><strong className="tabular">{horario ? dataHora(horario) : "—"}</strong></div>
                  <div className="ticket-row ticket-row--total"><span>Total</span><strong className="price-value">{precoNumerico !== null ? <AnimatedValue value={precoNumerico} format={moeda} /> : "—"}</strong></div>
                </div>

                <Aviso carregando={carregandoHorarios || (precisaVerificarPremio && cartao.carregando)}
                  erro={erroHorarios || (livres && !horarioValido ? "Esse horário não está mais disponível. Escolha outro." : undefined)} />

                {(!selecionado || !profissionalValido) && !servicos.carregando && !barbeiros.carregando && <Aviso erro="Revise o serviço e o profissional selecionados." />}

                {exigeConsentimentoPago && selecionado && (
                  <div className="reward-warning-box" role="alert">
                    <div className="reward-warning-head">
                      <AlertTriangle size={17} strokeWidth={1.8} />
                      <strong>{premioErroConsulta ? "Não foi possível validar sua recompensa agora" : "Recompensa indisponível para esta reserva"}</strong>
                    </div>
                    <p className="text-secondary">
                      {premioErroConsulta
                        ? `Falha ao consultar o cartão de fidelidade (${cartao.erro}). Tente validar novamente ou confirme explicitamente caso deseje agendar sem recompensa pelo valor de ${moeda(selecionado.preco)}.`
                        : `O benefício selecionado não está mais disponível para este serviço ou conta. Para evitar cobrança inesperada, confirme explicitamente se deseja prosseguir como reserva paga (${moeda(selecionado.preco)}).`}
                    </p>
                    {premioErroConsulta && (
                      <div>
                        <Botao variante="neutro" compacto onClick={() => cartao.recarregar()}>
                          <RefreshCw size={13} strokeWidth={1.75} /> Tentar validar recompensa novamente
                        </Botao>
                      </div>
                    )}
                    <label className="check-row">
                      <input type="checkbox" checked={confirmouPagoSemPremio} onChange={e => setConfirmouPagoSemPremio(e.target.checked)} />
                      <span>Confirmo prosseguir sem recompensa pelo valor de {moeda(selecionado.preco)}</span>
                    </label>
                  </div>
                )}

                {!precisaVerificarPremio && cartao.erro && <Aviso erro={cartao.erro} aoTentarNovamente={cartao.recarregar} />}

                {beneficios.length > 0 && (
                  <Campo nome="Usar recompensa de fidelidade">
                    <select value={usandoPremio ? premio : ""} disabled={ocupado} onChange={e => setPremio(e.target.value)}>
                      <option value="">Não usar recompensa agora</option>
                      {beneficios.map(b => <option key={b.id} value={b.id}>{b.premio} gratuito · benefício #{b.id}</option>)}
                    </select>
                  </Campo>
                )}

                {!sessao && horarioValido && <p className="text-secondary">Entre na sua conta para concluir a reserva. Suas escolhas ficam preservadas automaticamente.</p>}
              </div>
            )}

            <footer className="booking-footer">
              <div className="booking-footer-summary">
                <strong>{precoNumerico !== null ? <AnimatedValue value={precoNumerico} format={moeda} /> : "Escolha um serviço"}</strong>
                <small className="tabular">{horario ? `${hora(horario)} · ${data(dia)}` : selecionado ? selecionado.nome : `Etapa ${etapa + 1} de ${etapas.length}`}</small>
              </div>
              <div className="booking-footer-actions">
                {etapa > 0 && <Botao variante="neutro" disabled={ocupado} onClick={() => irPara(etapa - 1)}><ArrowLeft size={16} strokeWidth={1.75} /> Voltar</Botao>}
                {etapa < 3 ? (
                  <Botao disabled={!pronto[etapa]} onClick={() => { setErro(""); irPara(etapa + 1); }}>Continuar <ArrowRight size={16} strokeWidth={1.9} /></Botao>
                ) : (
                  <div className="booking-confirm-mobile">
                    {sessao ? (
                      <Botao type="submit" disabled={ocupado || !horarioValido || bloqueadoPorPremio}>{ocupado ? "Registrando…" : "Finalizar reserva"} <ArrowRight size={16} strokeWidth={1.9} /></Botao>
                    ) : (
                      <Link to="/login" state={{ destino: "/agendar?" + retorno.toString() }} onClick={preservarAntesDoLogin} className={`btn btn--primario${!horarioValido ? " is-disabled" : ""}`}>
                        <LogIn size={16} strokeWidth={1.8} /> Entrar para reservar
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </footer>
          </section>
        </div>

        <aside className="surface-card booking-summary">
          <span className="eyebrow">Resumo</span>
          <h3 className="summary-service">{selecionado?.nome ?? "Escolha um serviço"}</h3>
          <div className="summary-rows">
            {profissional && <p>{profissional.nome}</p>}
            {barbeiro === qualquer && <p>Qualquer profissional disponível</p>}
            {horario && <p className="summary-time tabular"><Clock3 size={14} strokeWidth={1.75} /> {dataHora(horario)}</p>}
            {selecionado && <p className="text-secondary tabular">{selecionado.duracaoMinutos} min</p>}
          </div>
          <div className="summary-total"><span>Total</span><strong className="price-value">{precoNumerico !== null ? <AnimatedValue value={precoNumerico} format={moeda} /> : "—"}</strong></div>
          {usandoPremio && <p className="appt-benefit"><Gift size={14} strokeWidth={1.75} /> Recompensa aplicada</p>}
          {etapa === 3 && (sessao ? (
            <Botao type="submit" className="btn--full" disabled={ocupado || !horarioValido || bloqueadoPorPremio}>{ocupado ? "Registrando…" : "Finalizar reserva"} <ArrowRight size={16} strokeWidth={1.9} /></Botao>
          ) : horarioValido && (
            <Link to="/login" state={{ destino: "/agendar?" + retorno.toString() }} onClick={preservarAntesDoLogin} className="btn btn--primario btn--full">
              <LogIn size={16} strokeWidth={1.8} /> Entrar para reservar
            </Link>
          ))}
        </aside>
      </form>
    </div>
  );
}
