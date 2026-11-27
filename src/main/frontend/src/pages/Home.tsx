import { useEffect, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Check, Clock3, Gift, Images, MapPin, Phone, Scissors } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useMarca } from "../components/useMarca";
import { Aviso, SkeletonCards, SkeletonSlots, Vazio } from "../components/Interface";
import { Expansivel, FotoEditorial, Vitrine } from "../components/Experiencia";
import { fotoDe, useFotos } from "../components/FotosPublicas";
import { Reveal, StaggerLine } from "../motion/Primitives";
import { useMotionPrefs, useSmoothNavigate } from "../motion/useMotion";
import { compararInicioAsc, dataHora, dataHoraCurta, iniciais, instanteAgenda, statusTexto } from "../services/formato";
import { useAgora } from "../services/useAgora";
import { useConsulta } from "../services/useConsulta";
import { obterSessao, temAlgumaPermissao, temPapel } from "../services/auth";
import { logoMarca } from "../services/marcaLogo";
import { aberturaDemo, fotoServico, fotoProfissional, interiorDemo } from "../services/fotosDemo";
import { BuscaVitrine, buscaVitrine, CardProfissional, CardServico } from "./VitrinePages";
import type { Agendamento, Barbeiro, Cartao, ExpedientePublico, Servico } from "../types/Barbearia";

const semana = [
  ["MONDAY", "Segunda"], ["TUESDAY", "Terça"], ["WEDNESDAY", "Quarta"],
  ["THURSDAY", "Quinta"], ["FRIDAY", "Sexta"], ["SATURDAY", "Sábado"], ["SUNDAY", "Domingo"],
];

export default function Home() {
  const { marca, erro, aberturaVista, concluirAbertura } = useMarca();
  const { pathname } = useLocation();
  const smoothNavigate = useSmoothNavigate();
  const { reduced } = useMotionPrefs();
  const agora = useAgora();

  const servicos = useConsulta<Servico[]>("/publico/servicos");
  const profissionais = useConsulta<Barbeiro[]>("/publico/barbeiros");
  const expediente = useConsulta<ExpedientePublico[]>("/publico/expediente");
  const fotos = useFotos();
  const sessao = obterSessao();
  const cliente = temPapel("CLIENTE");
  const equipe = temPapel("BARBEIRO") || temAlgumaPermissao(
    "AGENDAMENTOS_CONSULTAR", "AGENDAMENTOS_GERENCIAR", "AGENDAMENTOS_CONFIRMAR_CONCLUIR"
  );
  const agenda = useConsulta<Agendamento[]>(cliente ? "/agendamentos" : null);
  const cartao = useConsulta<Cartao>(cliente && marca?.fidelidadeAtiva ? "/fidelidade" : null);

  const proximo = agenda.dados
    ?.filter(a => ["RESERVADO", "CONFIRMADO"].includes(a.status) && instanteAgenda(a.fim) > agora)
    .toSorted(compararInicioAsc)[0];

  const [busca, setBusca] = useState("");
  const [servico, setServico] = useState("");
  const [saindoAbertura, setSaindoAbertura] = useState(false);
  const timerSaida = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerSaida.current), []);

  const lista = servicos.dados?.filter(s => buscaVitrine(busca, s.nome, s.descricao));
  const pessoas = profissionais.dados?.filter(b => buscaVitrine(busca, b.nome, b.descricao));
  const selecionado = servicos.dados?.find(s => String(s.id) === servico) ?? servicos.dados?.[0];
  const horarios = useConsulta<string[]>(selecionado && !equipe ? `/publico/proximos-horarios?servicoId=${selecionado.id}` : null);

  const fotoAbertura = fotoDe(fotos.dados, "ABERTURA")?.url;
  const capa = fotoDe(fotos.dados, "CAPA")?.url;
  const galeriaPublicada = fotos.dados?.filter(f => f.alvo === "GALERIA") ?? [];
  const logo = logoMarca(marca);
  const abrir = pathname === "/" && !sessao && !aberturaVista;

  function entrarNoStudio(destino: string) {
    if (saindoAbertura) return;
    if (reduced) { concluirAbertura(); smoothNavigate(destino); return; }
    setSaindoAbertura(true);
    timerSaida.current = window.setTimeout(() => { concluirAbertura(); smoothNavigate(destino); }, 300);
  }

  if (abrir) {
    return (
      <section className={`splash-screen${saindoAbertura ? " is-leaving" : ""}`}>
        <FotoEditorial className="splash-photo" src={fotoAbertura ?? capa ?? (marca?.demonstracao ? aberturaDemo : undefined)} alt={marca?.nome ?? "Studio Soldado do Corte"} prioridade />
        <div className="splash-scrim" aria-hidden="true" />
        <div className="splash-inner">
          <div className="splash-brand">
            {logo ? <img src={logo} alt={marca?.nome ?? "Studio Soldado do Corte"} /> : <strong>{marca?.nome ?? "Studio Soldado do Corte"}</strong>}
          </div>
          <div className="splash-content">
            <span className="splash-accent-rule" aria-hidden="true" />
            <h1 className="display-title">
              <StaggerLine delay={200}>Corte preciso.</StaggerLine>{" "}
              <StaggerLine delay={320}>No seu tempo.</StaggerLine>
            </h1>
            <p className="splash-copy-sub">{marca?.descricao || "Escolha o serviço, o profissional e reserve em poucos toques."}</p>
            <div className="splash-actions">
              <button type="button" className="btn btn--primario btn--lg btn--full" onClick={() => entrarNoStudio("/agendar")}>
                Agendar horário <ArrowRight size={17} strokeWidth={1.9} />
              </button>
              <button type="button" className="splash-secondary" onClick={() => entrarNoStudio("/inicio")}>Explorar o studio</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const primeiroNome = sessao?.nome.trim().split(/\s+/)[0];
  const metaSelos = cartao.dados?.meta ?? marca?.meta ?? 10;
  const progressoSelos = cartao.dados?.progresso ?? 0;
  const progressoPct = Math.min(100, Math.round((progressoSelos / Math.max(1, metaSelos)) * 100));
  const temPainelLateral = Boolean(proximo || (!equipe && selecionado) || (marca?.fidelidadeAtiva && !equipe));

  return (
    <div className="home-flow">
      <section className="home-top-row">
        <div className="home-header">
          <div>
            <span className="eyebrow">{primeiroNome ? "Seu espaço" : "Agendamento online"}</span>
            <h1>{primeiroNome ? `Olá, ${primeiroNome}` : "Agende seu próximo corte"}</h1>
          </div>
          {sessao && (
            <Link to="/perfil" className="avatar-pill" aria-label="Minha conta"><span>{iniciais(sessao.nome)}</span></Link>
          )}
        </div>
        <BuscaVitrine valor={busca} alterar={setBusca} rotulo="Buscar serviços ou profissionais" />
      </section>

      <Aviso erro={erro} />

      {!busca.trim() && (
        <section className={`home-bento${temPainelLateral ? " home-bento--split" : ""}`}>
          <div className="hero-banner">
            <FotoEditorial src={capa ?? (marca?.demonstracao ? "/studio/banner.webp" : undefined)} alt="Ambiente e atendimento" className="hero-banner-photo" prioridade revelar="expand" parallax />
            <div className="hero-banner-scrim" aria-hidden="true" />
            <div className="hero-banner-content">
              <span className="eyebrow">Atendimento com hora marcada</span>
              <h2 className="hero-banner-title">Seu estilo em boas mãos.</h2>
              <Link to={equipe ? "/agenda" : "/agendar"} className="btn btn--primario">
                {equipe ? "Abrir agenda" : "Agendar agora"} <ArrowRight size={16} strokeWidth={1.9} />
              </Link>
            </div>
          </div>

          {temPainelLateral && (
            <div className="home-bento-side">
              {proximo && (
                <Link to="/meus-horarios" className="next-appt-strip">
                  <div className="next-appt-icon"><CalendarDays size={17} strokeWidth={1.75} /></div>
                  <div className="next-appt-copy">
                    <div className="next-appt-label">
                      <span>Próximo agendamento</span>
                      <span className={`status-pill status-pill--${proximo.status.toLowerCase()}`}>
                        <i className="status-dot" aria-hidden="true" />{statusTexto[proximo.status]}
                      </span>
                    </div>
                    <strong>{proximo.servico}</strong>
                    <small className="tabular">{dataHora(proximo.inicio)} · {proximo.barbeiro}</small>
                  </div>
                  <ArrowRight size={16} strokeWidth={1.75} className="muted-arrow" />
                </Link>
              )}

              {!equipe && selecionado && (
                <section className="quick-slots-band">
                  <div className="quick-slots-head">
                    <div className="inline-title">
                      <Clock3 size={15} strokeWidth={1.75} className="accent-icon" />
                      <h2>Próximos horários</h2>
                    </div>
                    {servicos.dados && servicos.dados.length > 1 && (
                      <div className="chip-scroll" role="group" aria-label="Escolher serviço para horários">
                        {servicos.dados.map(s => (
                          <button type="button" key={s.id} className="chip chip--sm" onClick={() => setServico(String(s.id))} aria-pressed={selecionado.id === s.id}>
                            {s.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Aviso erro={horarios.erro} aoTentarNovamente={horarios.erro ? horarios.recarregar : undefined} />
                  {horarios.carregando && <SkeletonSlots quantidade={4} />}
                  {!horarios.carregando && horarios.dados?.length === 0 && <p className="text-secondary">Nenhum horário livre nos próximos 14 dias.</p>}
                  {!!horarios.dados?.length && (
                    <div className="quick-slots">
                      {horarios.dados.map(h => (
                        <Link className="slot-link tabular" key={h} to={`/agendar?servico=${selecionado.id}&profissional=qualquer&dia=${h.slice(0, 10)}&horario=${encodeURIComponent(h)}`}>
                          {dataHoraCurta(h)}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {marca?.fidelidadeAtiva && !equipe && (
                <Link className="loyalty-strip" to="/fidelidade">
                  <div className="loyalty-teaser-top">
                    <div className="icon-badge icon-badge--sm"><Gift size={16} strokeWidth={1.75} /></div>
                    <div className="loyalty-teaser-copy">
                      <span className="eyebrow">Fidelidade</span>
                      <strong className="tabular">{cartao.dados ? `${cartao.dados.progresso} de ${cartao.dados.meta} selos` : `A cada ${marca.meta} serviços, ganhe ${marca.nomePremio}`}</strong>
                    </div>
                    <ArrowRight size={16} strokeWidth={1.75} className="muted-arrow" />
                  </div>
                  {cartao.dados && cartao.dados.meta <= 12 ? (
                    <div className="mini-stamps" aria-hidden="true">
                      {Array.from({ length: cartao.dados.meta }, (_, i) => (
                        <span key={i} className={i < cartao.dados!.progresso ? "is-earned" : ""}>
                          {i < cartao.dados!.progresso ? <Check size={9} strokeWidth={3} /> : <Scissors size={8} strokeWidth={1.75} />}
                        </span>
                      ))}
                    </div>
                  ) : cartao.dados && <div className="thin-progress" aria-hidden="true"><span style={{ width: `${progressoPct}%` }} /></div>}
                </Link>
              )}
            </div>
          )}
        </section>
      )}

      <Reveal className="home-block" variant="up">
        <section className="home-block" id="catalogo">
          <div className="section-head">
            <h2>Serviços</h2>
            <Link to="/catalogo" className="text-link">Ver catálogo <ArrowRight size={15} strokeWidth={1.75} /></Link>
          </div>
          <Aviso erro={servicos.erro} aoTentarNovamente={servicos.erro ? servicos.recarregar : undefined} />
          {servicos.carregando && <SkeletonCards quantidade={3} />}
          {!servicos.carregando && lista?.length === 0 && <Vazio texto="Nenhum serviço encontrado." />}
          {!!lista?.length && (
            <div className="editorial-service-list">
              {lista.map((s, idx) => <CardServico s={s} key={s.id} foto={fotoServico(fotos.dados, s, marca?.demonstracao)} delay={idx * 65} />)}
            </div>
          )}
        </section>
      </Reveal>

      <Reveal className="home-block" variant="up" delay={40}>
        <section className="home-block">
          <div className="section-head">
            <div className="inline-title">
              <h2>Profissionais</h2>
              {marca?.demonstracao && <span className="demo-badge">Demonstração</span>}
            </div>
            <Link className="text-link" to="/equipe">Ver equipe <ArrowRight size={15} strokeWidth={1.75} /></Link>
          </div>
          <Aviso erro={profissionais.erro} aoTentarNovamente={profissionais.erro ? profissionais.recarregar : undefined} />
          {profissionais.carregando && <SkeletonCards quantidade={2} horizontal />}
          {!profissionais.carregando && pessoas?.length === 0 && <Vazio texto="Nenhum profissional encontrado." />}
          {!!pessoas?.length && (
            <Vitrine titulo="Profissionais" variante="compacta">
              {pessoas.map((b, idx) => <CardProfissional b={b} key={b.id} foto={fotoProfissional(fotos.dados, b, marca?.demonstracao)} delay={idx * 80} />)}
            </Vitrine>
          )}
        </section>
      </Reveal>

      {!busca.trim() && (
        <Reveal variant="up" delay={60}>
          <div className="home-footer-grid">
            {galeriaPublicada.length > 0 ? (
              <section className="home-block">
                <div className="section-head">
                  <h2>Galeria</h2>
                  <Link className="text-link" to="/galeria">Ver todas <ArrowRight size={15} strokeWidth={1.75} /></Link>
                </div>
                <div className="home-mosaic">
                  {galeriaPublicada.slice(0, 4).map((f, idx) => (
                    <Link key={f.id} to="/galeria" className="home-mosaic-item">
                      <FotoEditorial src={f.url} alt={f.legenda ?? "Galeria"} className="home-mosaic-media" revelar="curtain" delay={idx * 65} />
                    </Link>
                  ))}
                </div>
              </section>
            ) : (
              marca?.demonstracao && (
                <Link to="/galeria" className="studio-editorial-link">
                  <FotoEditorial src={interiorDemo} alt="Ambiente ilustrativo" className="studio-editorial-media" revelar="wipe" />
                  <div className="studio-editorial-copy">
                    <span className="eyebrow"><Images size={13} strokeWidth={1.75} /> Galeria</span>
                    <strong>Referências de cortes e ambiente</strong>
                    <small>Imagens ilustrativas do modo demonstração</small>
                  </div>
                  <ArrowRight size={16} strokeWidth={1.75} className="muted-arrow" />
                </Link>
              )
            )}

            <Expansivel titulo="Expediente e contato">
              <div className="info-accordion-grid">
                <div className="stack-xs">
                  <h3 className="section-title">Horário de funcionamento</h3>
                  <Aviso erro={expediente.erro} carregando={expediente.carregando} aoTentarNovamente={expediente.erro ? expediente.recarregar : undefined} />
                  {expediente.dados?.length === 0 && <p className="text-secondary">Expediente ainda não publicado.</p>}
                  <dl className="hours-list">
                    {semana.map(([chave, nome]) => {
                      const faixas = expediente.dados?.filter(f => f.dia === chave).sort((a, b) => a.inicio.localeCompare(b.inicio)) ?? [];
                      return faixas.length ? <div key={chave}><dt>{nome}</dt><dd className="tabular">{faixas.map(f => `${f.inicio.slice(0, 5)} – ${f.fim.slice(0, 5)}`).join(" · ")}</dd></div> : null;
                    })}
                  </dl>
                </div>
                {(marca?.endereco || marca?.telefone || marca?.whatsapp || marca?.instagram) && (
                  <div className="stack-xs">
                    <h3 className="section-title">Contato</h3>
                    {marca.endereco && <p className="contact-line"><MapPin size={15} strokeWidth={1.75} /> {marca.endereco}</p>}
                    {marca.telefone && <p className="contact-line"><Phone size={15} strokeWidth={1.75} /> {marca.telefone}</p>}
                    <div className="inline-actions">
                      {marca.whatsapp && <a className="btn btn--neutro btn--compacto" href={`https://wa.me/${marca.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a>}
                      {marca.instagram && <a className="btn btn--neutro btn--compacto" href={`https://www.instagram.com/${marca.instagram}/`} target="_blank" rel="noreferrer">Instagram</a>}
                    </div>
                  </div>
                )}
              </div>
            </Expansivel>
          </div>
        </Reveal>
      )}
    </div>
  );
}
