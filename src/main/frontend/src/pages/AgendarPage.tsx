import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck2, Check, Clock3, Gift, LogIn, UsersRound } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/api";
import { data, dataHora, hoje, hora, mensagem, moeda } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import { obterSessao, temPapel } from "../services/auth";
import { Aviso, Campo, Titulo, Vazio } from "../components/Interface";
import Botao from "../components/Botao";
import { FotoEditorial } from "../components/Experiencia";
import { useFotos } from "../components/FotosPublicas";
import { useMarca } from "../components/useMarca";
import Semana, { somarDias } from "../components/Semana";
import { fotoProfissional, fotoServico } from "../services/fotosDemo";
import type { Agendamento, Barbeiro, Cartao, Servico } from "../types/Barbearia";
import type { Usuario } from "../types/Usuario";

const etapas = ["Serviço", "Profissional", "Data e horário", "Revisão"];
const titulos = ["Escolha o serviço", "Escolha o profissional", "Escolha data e horário", "Revise sua reserva"];
const qualquer = "qualquer";
const periodos = ["Manhã", "Tarde", "Noite"];
function periodoDe(h: string) {
  const horas = Number(h.slice(11, 13));
  return horas < 12 ? "Manhã" : horas < 18 ? "Tarde" : "Noite";
}
const isoDia = /^\d{4}-\d{2}-\d{2}$/;
const isoHorario = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::00)?$/;
function dataValida(valor: string | null) {
  return valor && isoDia.test(valor) && valor >= hoje() && valor <= somarDias(hoje(), 90) && Number.isFinite(Date.parse(valor + "T12:00:00Z")) ? valor : hoje();
}

export default function AgendarPage() {
  const [params] = useSearchParams();
  const sessao = obterSessao();
  const admin = temPapel("ADMIN");
  const clienteLogado = temPapel("CLIENTE");
  const [servico, setServico] = useState(params.get("servico") ?? "");
  const [barbeiro, setBarbeiro] = useState(params.get("profissional") ?? "");
  const [dia, setDia] = useState(() => dataValida(params.get("dia")));
  const [horario, setHorario] = useState(() => {
    const h = params.get("horario");
    return h && isoHorario.test(h) && h.startsWith(dia) ? h : "";
  });
  const [periodo, setPeriodo] = useState(() => horario ? periodoDe(horario) : "");
  const [cliente, setCliente] = useState("");
  const [premio, setPremio] = useState(params.get("premio") ?? "");
  const [etapa, setEtapa] = useState(() => params.has("servico") && params.has("profissional") && horario ? (admin ? 0 : 3) : 0);
  const [sentido, setSentido] = useState("frente");
  const [versao, setVersao] = useState(0);
  const [reserva, setReserva] = useState<Agendamento>();
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const enviando = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const focar = useRef(false);
  const fotos = useFotos();
  const { marca } = useMarca();
  const servicos = useConsulta<Servico[]>("/publico/servicos");
  const barbeiros = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const clientes = useConsulta<Usuario[]>(admin ? "/usuarios" : null);
  const cartao = useConsulta<Cartao>(admin ? (cliente ? `/fidelidade/${cliente}` : null) : clienteLogado ? "/fidelidade" : null);
  const beneficios = cartao.dados?.historico.filter(m => m.tipo === "RECOMPENSA" && !m.agendamentoId && !m.resgatadoEm
    && m.servicoId?.toString() === servico) ?? [];
  const selecionado = servicos.dados?.find(s => String(s.id) === servico);
  const profissional = barbeiros.dados?.find(b => String(b.id) === barbeiro);
  const profissionalValido = barbeiro === qualquer || Boolean(profissional);
  const filtro = new URLSearchParams({ servicoId: servico });
  if (profissional) filtro.set("barbeiroId", String(profissional.id));
  const consultar = etapa >= 2 && selecionado && profissionalValido;
  const horarios = useConsulta<string[]>(consultar ? `/publico/horarios?${filtro}&data=${dia}&v=${versao}` : null);
  const sugestoes = useConsulta<string[]>(consultar && horarios.dados?.length === 0
    ? `/publico/proximos-horarios?${filtro}&aPartir=${somarDias(dia, 1)}&v=${versao}` : null);
  const periodosAbertos = periodos.filter(p => horarios.dados?.some(h => periodoDe(h) === p));
  const periodoAtual = periodosAbertos.includes(periodo) ? periodo : periodosAbertos[0];
  const horariosExibidos = horarios.dados?.filter(h => periodoDe(h) === periodoAtual);
  const horarioValido = Boolean(horario && horarios.dados?.includes(horario));
  const usandoPremio = beneficios.some(b => String(b.id) === premio);
  const pronto = [Boolean(selecionado && (!admin || cliente)), profissionalValido, horarioValido];

  useEffect(() => {
    if (!focar.current) return;
    titulo.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [etapa, reserva]);

  function irPara(destino: number) {
    focar.current = true;
    setSentido(destino < etapa ? "volta" : "frente");
    setEtapa(destino);
  }
  function escolherDia(d: string) {
    if (dia !== d) { setDia(d); setHorario(""); setErro(""); }
  }

  async function agendar(e: FormEvent) {
    e.preventDefault();
    if (etapa !== 3 || !sessao || !horarioValido || !selecionado || !profissionalValido || (admin && !cliente) || enviando.current) return;
    enviando.current = true;
    setOcupado(true); setErro("");
    try {
      const { data: resultado } = await api.post<Agendamento>("/agendamentos", {
        servicoId: selecionado.id, barbeiroId: profissional?.id ?? null, inicio: horario,
        clienteId: admin ? Number(cliente) : null, premioId: usandoPremio ? Number(premio) : null,
      });
      focar.current = true;
      setReserva(resultado);
    } catch (e) { setErro(mensagem(e)); setHorario(""); setVersao(v => v + 1); irPara(2); }
    finally { enviando.current = false; setOcupado(false); }
  }

  if (sessao && !admin && !clienteLogado) return <Vazio texto="Use uma conta de cliente para reservar um horário." />;
  if (reserva) return <section className="panel booking-result">
    <span className="large-icon confirmation-mark"><CalendarCheck2 size={30} /></span>
    <h1 tabIndex={-1} ref={titulo}>Horário reservado</h1>
    <div className="reservation-ticket"><strong>{reserva.servico}</strong><p>Com {reserva.barbeiro}</p><p>{dataHora(reserva.inicio)}</p>
      <p>{hora(reserva.inicio)} – {hora(reserva.fim)} · {moeda(reserva.preco)}</p></div>
    <Link className="button button--primario" to={admin ? `/agenda?data=${reserva.inicio.slice(0, 10)}` : "/meus-horarios"}>
      {admin ? "Ver agenda" : "Meus horários"} <ArrowRight size={17} /></Link>
    <Link className="studio-text-link" to="/inicio"><ArrowLeft size={17} /> Voltar ao início</Link>
  </section>;

  const retorno = new URLSearchParams({ servico, profissional: barbeiro, dia, horario });
  if (premio) retorno.set("premio", premio);
  return <div className="booking-v2 studio-booking">
    <Titulo titulo={admin ? "Nova reserva" : "Agende seu horário"} />
    <ol className="booking-steps" aria-label="Etapas do agendamento">{etapas.map((nome, i) => <li key={nome}>
      <button type="button" disabled={i > etapa || ocupado} aria-current={i === etapa ? "step" : undefined}
        className={i < etapa ? "step-done" : ""} onClick={() => irPara(i)}>
        <span>{i < etapa ? <Check size={15} /> : i + 1}</span><small>{nome}</small>
      </button>
    </li>)}</ol>
    <form className="booking-grid" onSubmit={agendar}>
      <section className="panel form-stack booking-stage" key={etapa} data-sentido={sentido} data-etapa={etapa}>
        <h2 tabIndex={-1} ref={titulo}>{titulos[etapa]}</h2>
        <Aviso erro={erro || servicos.erro || barbeiros.erro || clientes.erro || cartao.erro}
          carregando={servicos.carregando || barbeiros.carregando || clientes.carregando} />
        {etapa === 0 && <>
          {admin && <Campo nome="Cliente"><select value={cliente} required onChange={e => { setCliente(e.target.value); setPremio(""); }}>
            <option value="">Selecione o cliente</option>{clientes.dados?.filter(c => c.ativo && c.permissoes.some(p => p.nome === "CLIENTE"))
              .map(c => <option key={c.id} value={c.id}>{c.nome} ({c.username})</option>)}</select></Campo>}
          <fieldset className="booking-options" aria-label="Serviços">{servicos.dados?.map(s => <label key={s.id} className="booking-option">
            <input type="radio" name="servico" value={s.id} checked={servico === String(s.id)}
              onChange={() => { setServico(String(s.id)); setHorario(""); setPremio(""); }} />
            <span className="booking-option-card"><FotoEditorial src={fotoServico(fotos.dados, s, marca?.demonstracao)} />
              <span><strong>{s.nome}</strong>{s.descricao && <small>{s.descricao}</small>}<small>{s.duracaoMinutos} min · {moeda(s.preco)}</small></span>
              {servico === String(s.id) && <Check size={18} className="accent selection-mark" />}</span>
          </label>)}</fieldset>
          {servicos.dados?.length === 0 && <p className="muted">Nenhum serviço disponível.</p>}
        </>}
        {etapa === 1 && <>
          {marca?.demonstracao && <p className="demo-caption">Perfis e fotos de demonstração</p>}
          <fieldset className="booking-options" aria-label="Profissionais">
            {Boolean(barbeiros.dados?.length) && <label className="booking-option">
              <input type="radio" name="profissional" value={qualquer} checked={barbeiro === qualquer}
                onChange={() => { setBarbeiro(qualquer); setHorario(""); }} />
              <span className="booking-option-card"><span className="large-icon"><UsersRound size={22} /></span>
                <span><strong>Qualquer profissional disponível</strong><small>Escolha entre os horários da equipe</small></span>
                {barbeiro === qualquer && <Check size={18} className="accent selection-mark" />}</span>
            </label>}
            {barbeiros.dados?.map(b => <label className="booking-option" key={b.id}>
              <input type="radio" name="profissional" value={b.id} checked={barbeiro === String(b.id)}
                onChange={() => { setBarbeiro(String(b.id)); setHorario(""); }} />
              <span className="booking-option-card"><FotoEditorial src={fotoProfissional(fotos.dados, b, marca?.demonstracao)} />
                <span><strong>{b.nome}</strong>{b.descricao && <small>{b.descricao}</small>}</span>
                {barbeiro === String(b.id) && <Check size={18} className="accent selection-mark" />}</span>
            </label>)}</fieldset>
          {barbeiros.dados?.length === 0 && <p className="muted">Nenhum profissional disponível.</p>}
        </>}
        {etapa === 2 && <>
          {profissional && <div className="booking-person"><FotoEditorial src={fotoProfissional(fotos.dados, profissional, marca?.demonstracao)} />
            <span><strong>{profissional.nome}</strong><small>{profissional.descricao}</small></span></div>}
          <Semana key={dia.slice(0, 7)} dia={dia} escolher={escolherDia} />
          <fieldset className="times"><legend>Horários disponíveis</legend>
            <Aviso carregando={horarios.carregando} erro={horarios.erro} />
            {periodosAbertos.length > 1 && <div className="periodos-horario" role="group" aria-label="Filtrar horários por período">
              {periodosAbertos.map(p => <button type="button" key={p} aria-pressed={p === periodoAtual} onClick={() => setPeriodo(p)}>{p}</button>)}
            </div>}
            <div className="time-grid">{horariosExibidos?.map(h => <label key={h} className="time-slot">
              <input type="radio" name="horario" value={h} checked={horario === h} onChange={() => setHorario(h)} /><span>{hora(h)}</span>
            </label>)}</div>
            {horarios.dados?.length === 0 && <div className="stack"><p className="muted">Sem horários em {data(dia)}.</p>
              <Aviso carregando={sugestoes.carregando} erro={sugestoes.erro} />
              <div className="slot-links">{sugestoes.dados?.map(h => <Botao variante="neutro" key={h}
                onClick={() => { setDia(h.slice(0, 10)); setHorario(h); setPeriodo(periodoDe(h)); setErro(""); }}>{dataHora(h)}</Botao>)}</div>
              {sugestoes.dados?.length === 0 && <small className="muted">Tente outra semana ou profissional.</small>}</div>}
          </fieldset>
        </>}
        {etapa === 3 && <>
          {horario && <p className="inline-icon"><CalendarCheck2 size={22} /> {dataHora(horario)}</p>}
          <p className="muted">{barbeiro === qualquer ? "Um profissional disponível será atribuído na confirmação." : profissional?.nome}</p>
          <Aviso carregando={horarios.carregando} erro={horarios.erro || (horarios.dados && !horarioValido ? "Esse horário não está mais disponível. Escolha outro." : undefined)} />
          {(!selecionado || !profissionalValido) && !servicos.carregando && !barbeiros.carregando && <Aviso erro="Revise o serviço e o profissional selecionados." />}
          {beneficios.length > 0 && <Campo nome="Recompensa"><select value={premio} disabled={ocupado} onChange={e => setPremio(e.target.value)}>
            <option value="">Sem recompensa</option>{beneficios.map(b => <option key={b.id} value={b.id}>{b.premio} gratuito · benefício #{b.id}</option>)}
          </select></Campo>}
        </>}
        <div className="booking-controls">
          {etapa > 0 && <Botao variante="neutro" disabled={ocupado} onClick={() => irPara(etapa - 1)}><ArrowLeft size={17} /> Voltar</Botao>}
          {etapa === 2 && horarioValido && <span className="studio-picked-time" aria-live="polite">{hora(horario)} selecionado</span>}
          {etapa < 3 && <Botao disabled={!pronto[etapa]} onClick={() => { setErro(""); irPara(etapa + 1); }}>Continuar <ArrowRight size={17} /></Botao>}
        </div>
      </section>
      <aside className="panel booking-summary">
        <h2>Seu horário</h2><p>{selecionado?.nome ?? "Escolha um serviço"}</p>
        {profissional && <p className="muted">{profissional.nome}</p>}
        {barbeiro === qualquer && <p className="muted">Qualquer profissional</p>}
        {horario && <p className="inline-icon muted"><Clock3 size={17} /> {dataHora(horario)}</p>}
        {selecionado && <p className="muted">{selecionado.duracaoMinutos} min</p>}
        <div className="summary-price"><span>Total</span><strong>{selecionado ? moeda(usandoPremio ? 0 : selecionado.preco) : "—"}</strong></div>
        {usandoPremio && <p className="inline-icon"><Gift size={17} /> Recompensa selecionada</p>}
        {etapa === 3 && (sessao
          ? <Botao type="submit" disabled={ocupado || !horarioValido || (Boolean(premio) && cartao.carregando)}>
            {ocupado ? "Reservando…" : "Confirmar agendamento"} <ArrowRight size={17} /></Botao>
          : horarioValido && <Link to="/login" state={{ destino: "/agendar?" + retorno.toString() }} className="button button--primario">
            <LogIn size={18} /> Entrar para confirmar</Link>)}
      </aside>
    </form>
  </div>;
}
