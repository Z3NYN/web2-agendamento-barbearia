import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, CalendarDays, Clock3, Gift, MapPin, Menu, Scissors, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMarca } from "../components/useMarca";
import { useScrollReveal } from "../motion/useMotion";
import { ehWordmarkOficial, LOGO_OFICIAL, logoMarca } from "../services/marcaLogo";
import { useConsulta } from "../services/useConsulta";
import type { Servico } from "../types/Barbearia";

const HERO_TRIPTYCH = [
  {
    src: "/studio/portfolio/degrade-tribal.jpg",
    width: 244,
    height: 254,
    alt: "Corte degradê com desenho tribal lateral finalizado na navalha",
    rotulo: "Degradê & freestyle",
    slot: "lead",
  },
  {
    src: "/studio/portfolio/desenho-nuca.jpg",
    width: 274,
    height: 369,
    alt: "Detalhe de nuca com desenho geométrico em cabelo crespo",
    rotulo: "Acabamento na nuca",
    slot: "center",
  },
  {
    src: "/studio/portfolio/desenho-lateral.jpg",
    width: 199,
    height: 269,
    alt: "Corte lateral navalhado com linhas curvas e degradê limpo",
    rotulo: "Traço lateral",
    slot: "right",
  },
] as const;

// Portfólio destaca primeiro os trabalhos ainda não exibidos no hero para maior variedade visual.
const PORTFOLIO_TRABALHOS = [
  {
    src: "/studio/portfolio/cabelo-azul.jpg",
    width: 274,
    height: 294,
    alt: "Cabelo com coloração azul e traços freestyle laterais",
    titulo: "Química & cor",
    detalhe: "Coloração e freestyle",
  },
  {
    src: "/studio/portfolio/desenho-coruja.jpg",
    width: 276,
    height: 368,
    alt: "Arte freestyle feita na navalha na nuca com degradê",
    titulo: "Freestyle na nuca",
    detalhe: "Arte autoral na navalha",
  },
  {
    src: "/studio/portfolio/desenho-nuca.jpg",
    width: 274,
    height: 369,
    alt: "Acabamento geométrico na nuca com degradê preciso",
    titulo: "Desenho geométrico",
    detalhe: "Precisão na nuca",
  },
  {
    src: "/studio/portfolio/desenho-lateral.jpg",
    width: 199,
    height: 269,
    alt: "Detalhe lateral de corte degradê com risco autoral",
    titulo: "Traço lateral",
    detalhe: "Degradê navalhado",
  },
] as const;

const PILARES_SERVICOS = [
  {
    numero: "01",
    titulo: "Corte",
    descricao: "Degradê, social, navalhado e desenhos autorais com foco em proporção e acabamento limpo.",
  },
  {
    numero: "02",
    titulo: "Barba",
    descricao: "Modelagem, alinhamento e finalização técnica para valorizar o desenho natural do rosto.",
  },
  {
    numero: "03",
    titulo: "Química",
    descricao: "Coloração, platinado, luzes e texturização executados com técnica e cuidado profissional.",
  },
] as const;

const PASSOS_AGENDAMENTO = [
  {
    numero: "01",
    titulo: "Escolha seu serviço",
    descricao: "Selecione o atendimento desejado no catálogo do Studio.",
  },
  {
    numero: "02",
    titulo: "Selecione o profissional e o horário disponível",
    descricao: "Consulte a agenda em tempo real e escolha o melhor horário.",
  },
  {
    numero: "03",
    titulo: "Confirme seu agendamento",
    descricao: "Finalize a reserva e acompanhe seus atendimentos direto pela plataforma.",
  },
] as const;

export default function LandingPage() {
  const { marca } = useMarca();
  const servicos = useConsulta<Servico[]>("/publico/servicos");
  const [menuAberto, setMenuAberto] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  const { ref: servicosRef, visible: servicosEmTela } = useScrollReveal<HTMLElement>({ threshold: 0.02, rootMargin: "0px 0px -20px 0px" });
  const { ref: portfolioRef, visible: portfolioEmTela } = useScrollReveal<HTMLElement>({ threshold: 0.02, rootMargin: "0px 0px -20px 0px" });
  const { ref: passosRef, visible: passosEmTela } = useScrollReveal<HTMLElement>({ threshold: 0.02, rootMargin: "0px 0px -20px 0px" });
  const { ref: fidelidadeRef, visible: fidelidadeEmTela } = useScrollReveal<HTMLElement>({ threshold: 0.02, rootMargin: "0px 0px -20px 0px" });
  const { ref: fechamentoRef, visible: fechamentoEmTela } = useScrollReveal<HTMLElement>({ threshold: 0.02, rootMargin: "0px 0px -20px 0px" });

  const logo = logoMarca(marca) ?? LOGO_OFICIAL;
  const wordmarkIntegrado = ehWordmarkOficial(logo);
  const nomeMarca = marca?.nome || "Studio Soldado do Corte";
  const localizacao = marca?.endereco?.trim() || "Trindade — GO";
  const instagramHandle = marca?.instagram?.trim() || "soldado_docorte";
  const instagramUrl = `https://www.instagram.com/${instagramHandle.replace(/^@/, "")}/`;
  const metaSelos = marca?.meta ?? 10;
  const nomePremio = marca?.nomePremio;
  const fidelidadeAtiva = marca?.fidelidadeAtiva ?? true;
  const servicosPublicos = servicos.dados?.slice(0, 6) ?? [];

  const fecharMenu = () => setMenuAberto(false);

  useEffect(() => {
    if (!menuAberto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuAberto(false);
        menuBtnRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuAberto]);

  return (
    <div className="landing-root">
      <a href="#landing-conteudo" className="skip-link">Ir para o conteúdo</a>

      <header className="landing-header">
        <div className="landing-container landing-header-inner">
          <Link className="brand-link" to="/" aria-label={nomeMarca} onClick={fecharMenu}>
            <span className={`brand-logo-wrap${wordmarkIntegrado ? " brand-logo-wrap--wordmark" : ""}`}>
              <img src={logo} alt={nomeMarca} />
            </span>
            <span className={wordmarkIntegrado ? "sr-only" : "brand-name"}>{nomeMarca}</span>
          </Link>

          <nav
            id="landing-nav"
            className={`landing-nav${menuAberto ? " landing-nav--open" : ""}`}
            aria-label="Navegação principal"
          >
            <Link to="/catalogo" onClick={fecharMenu}>Serviços</Link>
            <Link to="/galeria" onClick={fecharMenu}>Galeria</Link>
            <Link to="/fidelidade" onClick={fecharMenu}>Fidelidade</Link>
            <Link to="/login" onClick={fecharMenu}>Entrar</Link>
            <Link to="/agendar" className="btn btn--primario btn--compacto landing-nav-cta" onClick={fecharMenu}>
              Agendar horário
            </Link>
          </nav>

          <div className="landing-header-mobile">
            <Link to="/agendar" className="btn btn--primario btn--compacto" onClick={fecharMenu}>
              Agendar
            </Link>
            <button
              ref={menuBtnRef}
              type="button"
              className="icon-btn landing-menu-btn"
              aria-expanded={menuAberto}
              aria-controls="landing-nav"
              aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuAberto(v => !v)}
            >
              {menuAberto ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </header>

      <div id="landing-conteudo">
        <section className="landing-hero">
          <div className="landing-container landing-hero-grid">
            <div className="landing-hero-copy">
              <div className="landing-kicker">
                <MapPin size={14} strokeWidth={1.8} aria-hidden="true" />
                <span>{localizacao}</span>
                <span className="landing-kicker-dot" aria-hidden="true">·</span>
                <span>Seg a sáb, 8h às 21h</span>
              </div>

              <span className="landing-hairline landing-hairline--hero" aria-hidden="true" />

              <h1 className="display-title landing-headline">
                <span className="landing-line-mask">
                  <span className="landing-line landing-line--1">Corte não é detalhe.</span>
                </span>
                <span className="landing-line-mask">
                  <span className="landing-line landing-line--2">É identidade.</span>
                </span>
              </h1>

              <p className="landing-lead">
                Corte, barba e química com acabamento autoral e agendamento online em poucos toques.
              </p>

              <div className="landing-hero-actions">
                <Link to="/agendar" className="btn btn--primario btn--lg landing-cta-primary">
                  <span>Agendar meu horário</span>
                  <ArrowRight size={17} strokeWidth={1.9} className="landing-cta-arrow" />
                </Link>
                <a href="#trabalhos" className="landing-ghost-cta">
                  Conhecer o Studio
                </a>
              </div>

              <div className="landing-pillars-meta" aria-label="Serviços oferecidos">
                <span>Corte</span>
                <span aria-hidden="true">•</span>
                <span>Barba</span>
                <span aria-hidden="true">•</span>
                <span>Química</span>
              </div>
            </div>

            <div className="landing-triptych" aria-label="Fotografias reais de cortes do Studio Soldado do Corte">
              {HERO_TRIPTYCH.map((item, idx) => (
                <figure
                  key={item.src}
                  className={`landing-triptych-item landing-triptych-item--${item.slot}`}
                  style={{ "--photo-delay": `${140 + idx * 95}ms` } as React.CSSProperties}
                >
                  <div className="landing-triptych-frame">
                    <img
                      src={item.src}
                      width={item.width}
                      height={item.height}
                      alt={item.alt}
                      loading="eager"
                      fetchPriority={idx === 0 ? "high" : "auto"}
                      decoding="async"
                    />
                    <figcaption>{item.rotulo}</figcaption>
                  </div>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section
          id="servicos"
          ref={servicosRef}
          className={`landing-section landing-motion-lines${servicosEmTela ? " is-in" : ""}`}
        >
          <div className="landing-container">
            <div className="landing-section-head">
              <div>
                <span className="eyebrow">Especialidades</span>
                <h2 className="landing-section-title">Corte • Barba • Química</h2>
              </div>
              <Link to="/catalogo" className="text-link landing-inline-link">
                <span>Ver catálogo completo</span>
                <ArrowRight size={15} strokeWidth={1.75} className="landing-cta-arrow" />
              </Link>
            </div>

            <div className="landing-services-grid">
              {PILARES_SERVICOS.map((pilar, idx) => (
                <article
                  key={pilar.numero}
                  className="landing-service-item"
                  style={{ "--item-delay": `${idx * 90}ms` } as React.CSSProperties}
                >
                  <span className="landing-rule-draw" aria-hidden="true" />
                  <span className="landing-index">{pilar.numero}</span>
                  <h3>{pilar.titulo}</h3>
                  <p>{pilar.descricao}</p>
                </article>
              ))}
            </div>

            {servicosPublicos.length > 0 && (
              <div className="landing-catalog-bar">
                <span className="landing-catalog-label">
                  <Scissors size={14} strokeWidth={1.8} aria-hidden="true" />
                  Disponíveis para agendamento online:
                </span>
                <div className="landing-catalog-chips">
                  {servicosPublicos.map(s => (
                    <Link key={s.id} to={`/agendar?servico=${s.id}`} className="landing-service-chip">
                      {s.nome}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section
          id="trabalhos"
          ref={portfolioRef}
          className={`landing-section landing-section--tinted landing-motion-photos${portfolioEmTela ? " is-in" : ""}`}
        >
          <div className="landing-container">
            <div className="landing-section-head">
              <div>
                <span className="eyebrow">Portfólio real</span>
                <h2 className="landing-section-title">Precisão em cada traço</h2>
              </div>
              <Link to="/galeria" className="text-link landing-inline-link">
                <span>Explorar galeria</span>
                <ArrowRight size={15} strokeWidth={1.75} className="landing-cta-arrow" />
              </Link>
            </div>

            <div className="landing-work-grid">
              {PORTFOLIO_TRABALHOS.map((item, idx) => (
                <figure
                  key={item.src}
                  className="landing-work-card"
                  style={{ "--photo-delay": `${idx * 75}ms` } as React.CSSProperties}
                >
                  <div className="landing-work-media">
                    <img
                      src={item.src}
                      width={item.width}
                      height={item.height}
                      alt={item.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <figcaption className="landing-work-caption">
                    <strong>{item.titulo}</strong>
                    <span>{item.detalhe}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          ref={passosRef}
          className={`landing-section landing-motion-rail${passosEmTela ? " is-in" : ""}`}
        >
          <div className="landing-container">
            <div className="landing-section-head">
              <div>
                <span className="eyebrow">Agendamento online</span>
                <h2 className="landing-section-title">Reserve em três passos</h2>
              </div>
              <Link to="/agendar" className="text-link landing-inline-link">
                <span>Abrir agenda</span>
                <ArrowRight size={15} strokeWidth={1.75} className="landing-cta-arrow" />
              </Link>
            </div>

            <div className="landing-steps-wrap">
              <span className="landing-rail-track" aria-hidden="true" />
              <ol className="landing-steps-grid">
                {PASSOS_AGENDAMENTO.map((passo, idx) => (
                  <li
                    key={passo.numero}
                    className="landing-step-item"
                    style={{ "--item-delay": `${idx * 100}ms` } as React.CSSProperties}
                  >
                    <span className="landing-step-node">
                      <span className="landing-index">{passo.numero}</span>
                    </span>
                    <h3>{passo.titulo}</h3>
                    <p>{passo.descricao}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="landing-steps-cta">
              <Link to="/agendar" className="btn btn--primario btn--lg landing-cta-primary">
                <CalendarDays size={17} strokeWidth={1.85} />
                <span>Agendar meu horário</span>
                <ArrowRight size={16} strokeWidth={1.9} className="landing-cta-arrow" />
              </Link>
            </div>
          </div>
        </section>

        {fidelidadeAtiva && (
          <section
            id="fidelidade"
            ref={fidelidadeRef}
            className={`landing-section landing-section--tinted landing-motion-loyalty${fidelidadeEmTela ? " is-in" : ""}`}
          >
            <div className="landing-container landing-loyalty-grid">
              <div className="landing-loyalty-copy">
                <span className="eyebrow">Programa de fidelidade</span>
                <h2 className="landing-section-title">Seu cartão fidelidade digital</h2>
                <p className="landing-loyalty-text">
                  Cada atendimento elegível concluído no {nomeMarca} soma automaticamente um selo no seu cartão. Ao completar{" "}
                  <strong>{metaSelos} selos</strong>, você libera{" "}
                  <strong>{nomePremio ? nomePremio : "sua recompensa configurada"}</strong> para resgatar no próximo agendamento online.
                </p>
                <div>
                  <Link to="/fidelidade" className="btn btn--neutro btn--lg landing-cta-secondary">
                    <Gift size={16} strokeWidth={1.8} />
                    <span>Acessar fidelidade</span>
                    <ArrowRight size={16} strokeWidth={1.8} className="landing-cta-arrow" />
                  </Link>
                </div>
              </div>

              <div className="physical-card landing-loyalty-preview" aria-label={`Prévia do cartão fidelidade com meta de ${metaSelos} selos`}>
                <div className="physical-card-head">
                  <div className="physical-card-brand">
                    <img src={logo} alt={nomeMarca} loading="lazy" />
                  </div>
                  <div className="physical-card-tag">
                    <span>Cartão Fidelidade</span>
                  </div>
                </div>
                <div className="physical-card-rule" aria-hidden="true" />
                <div className="landing-loyalty-meta">
                  <span>Meta atual</span>
                  <strong>{metaSelos} selos</strong>
                </div>
                <div className="landing-stamp-row" aria-hidden="true">
                  {Array.from({ length: Math.min(metaSelos, 10) }).map((_, i) => (
                    <span
                      key={i}
                      className={`landing-stamp-dot${i < 3 ? " is-sample" : ""}`}
                      style={i < 3 ? ({ "--stamp-delay": `${140 + i * 110}ms` } as React.CSSProperties) : undefined}
                    />
                  ))}
                </div>
                <div className="physical-card-foot">
                  <span>Recompensa</span>
                  <strong>{nomePremio || "Configurada pelo Studio"}</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        <section
          ref={fechamentoRef}
          className={`landing-closing${fechamentoEmTela ? " is-in" : ""}`}
        >
          <div className="landing-container landing-closing-inner">
            <div className="landing-closing-copy">
              <span className="landing-hairline landing-hairline--closing" aria-hidden="true" />
              <h2 className="display-title landing-closing-title">
                Corte não é detalhe. É identidade.
              </h2>
              <p>
                Reserve seu horário online ou entre na sua conta para acompanhar agendamentos e selos de fidelidade.
              </p>
              <div className="landing-closing-actions">
                <Link to="/agendar" className="btn btn--primario btn--lg landing-cta-primary">
                  <span>Agendar meu horário</span>
                  <ArrowRight size={17} strokeWidth={1.9} className="landing-cta-arrow" />
                </Link>
                <Link to="/login" className="btn btn--neutro btn--lg">
                  Entrar na minha conta
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="landing-footer">
        <div className="landing-container landing-footer-grid">
          <div className="landing-footer-brand">
            <img src={logo} alt={nomeMarca} loading="lazy" />
            <p className="landing-footer-name">{nomeMarca}</p>
            <p className="landing-footer-meta">
              <MapPin size={14} strokeWidth={1.75} aria-hidden="true" /> {localizacao}
            </p>
            <p className="landing-footer-meta">
              <Clock3 size={14} strokeWidth={1.75} aria-hidden="true" /> Segunda a sábado, das 8h às 21h
            </p>
          </div>

          <nav className="landing-footer-links" aria-label="Links do rodapé">
            <span className="landing-footer-heading">Navegação</span>
            <Link to="/catalogo">Serviços</Link>
            <Link to="/galeria">Galeria</Link>
            <Link to="/fidelidade">Fidelidade</Link>
            <Link to="/agendar">Agendar horário</Link>
            <Link to="/login">Entrar</Link>
          </nav>

          <div className="landing-footer-social">
            <span className="landing-footer-heading">Instagram oficial</span>
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="landing-instagram-link"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
              <span>@{instagramHandle.replace(/^@/, "")}</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
