import {
  BarChart3, CalendarDays, CalendarPlus, ChevronDown, CircleUserRound, Clock3, ExternalLink,
  Gift, Home as InicioIcon, KeyRound, LayoutDashboard, LogOut, Menu, Palette,
  Scissors, Shield, UsersRound, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import {
  obterSessao, rotaPadraoSessao, sair, temAcessoGestao, temAlgumaPermissao, temPapel, temPermissao,
} from "../services/auth";
import { ehWordmarkOficial, logoMarca } from "../services/marcaLogo";
import { cancelarWebPush, limparInscricaoPushLocal } from "../services/pwa";
import { useRouteDirection } from "../motion/useMotion";
import NotificacoesBell from "./NotificacoesBell";
import { useMarca } from "./useMarca";

export default function Layout() {
  const [aberto, abrir] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { marca, aberturaVista } = useMarca();
  const direcao = useRouteDirection();
  const sessao = obterSessao();
  const ehCliente = temPapel("CLIENTE");
  const podeVerAgendaEquipe = temPapel("BARBEIRO") || temAlgumaPermissao(
    "AGENDAMENTOS_CONSULTAR", "AGENDAMENTOS_GERENCIAR", "AGENDAMENTOS_CONFIRMAR_CONCLUIR"
  );
  const podeVerPainel = temPermissao("DASHBOARD_ANALITICO");
  const possuiGestao = temAcessoGestao();
  const logo = logoMarca(marca);
  const wordmarkIntegrado = ehWordmarkOficial(logo);

  const entradaPublica = pathname === "/" && !sessao;
  const aberturaImersiva = pathname === "/" && !sessao && !aberturaVista;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    abrir(false);
  }, [pathname]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const aoReceberMensagem = (event: MessageEvent) => {
      const dados = event.data as { type?: string; url?: string } | null;
      if (dados?.type === "SOLDADO_NAVIGATE" && typeof dados.url === "string" && dados.url.startsWith("/")) {
        navigate(dados.url);
      }
    };
    navigator.serviceWorker.addEventListener("message", aoReceberMensagem);
    return () => navigator.serviceWorker.removeEventListener("message", aoReceberMensagem);
  }, [navigate]);

  async function logout() {
    try {
      await cancelarWebPush();
      await api.post("/logout");
    } catch { /* A sessão local sempre é encerrada. */ }
    finally {
      void limparInscricaoPushLocal();
      sair();
      abrir(false);
      navigate("/", { replace: true });
    }
  }

  if (entradaPublica || aberturaImersiva) {
    return <main id="conteudo" className="splash-shell"><Outlet /></main>;
  }

  const gruposTodos = [
    {
      titulo: "Gestão do negócio",
      itens: [
        ["/painel", "Visão geral", LayoutDashboard, ["DASHBOARD_ANALITICO"]],
        ["/agenda", "Agenda", CalendarDays, ["AGENDAMENTOS_CONSULTAR", "AGENDAMENTOS_GERENCIAR", "AGENDAMENTOS_CONFIRMAR_CONCLUIR"]],
        ["/desempenho", "Desempenho", BarChart3, ["DASHBOARD_ANALITICO"]],
        ["/clientes", "Clientes", UsersRound, ["CLIENTES_GERENCIAR", "FIDELIDADE_ADMINISTRAR"]],
      ] as const,
    },
    {
      titulo: "Operação",
      itens: [
        ["/servicos", "Serviços", Scissors, ["SERVICOS_GERENCIAR"]],
        ["/profissionais", "Profissionais", CircleUserRound, ["PROFISSIONAIS_GERENCIAR"]],
        ["/expediente", "Expediente", Clock3, ["DISPONIBILIDADE_GERENCIAR"]],
        ["/fidelidade-programa", "Fidelidade", Gift, ["FIDELIDADE_ADMINISTRAR"]],
      ] as const,
    },
    {
      titulo: "Administração",
      itens: [
        ["/marca", "Identidade visual", Palette, ["MARCA_PERSONALIZAR", "GALERIA_GERENCIAR"]],
        ["/usuarios", "Usuários", UsersRound, ["USUARIOS_GERENCIAR"]],
        ["/permissoes", "Permissões", Shield, ["PERMISSOES_GERENCIAR"]],
        ["/atribuir-permissoes", "Acessos", KeyRound, ["ACESSOS_ATRIBUIR"]],
      ] as const,
    },
  ];

  const gruposAdmin = gruposTodos
    .map(g => ({
      titulo: g.titulo,
      itens: g.itens.filter(([, , , caps]) => temAlgumaPermissao(...caps)),
    }))
    .filter(g => g.itens.length > 0);

  const itensDropdown = gruposAdmin
    .flatMap(g => g.itens)
    .filter(([rota]) => rota !== "/painel" && rota !== "/agenda" && rota !== "/desempenho");

  const rotasGestao = [
    "/painel", "/desempenho", "/agenda", "/clientes", "/servicos", "/profissionais",
    "/expediente", "/fidelidade-programa", "/marca", "/usuarios", "/permissoes", "/atribuir-permissoes",
  ];
  const menuAdmin = possuiGestao && rotasGestao.some(r => pathname === r || pathname.startsWith(r + "/"));
  const exibirNavCliente = !sessao || ehCliente || (!podeVerAgendaEquipe && !menuAdmin);

  const itensMobile = [
    { rota: "/inicio", nome: "Início", Icone: InicioIcon, primario: false },
    { rota: "/catalogo", nome: "Serviços", Icone: Scissors, primario: false },
    { rota: "/agendar", nome: "Agendar", Icone: CalendarPlus, primario: true },
    { rota: "/fidelidade", nome: "Fidelidade", Icone: Gift, primario: false },
    { rota: "/perfil", nome: "Perfil", Icone: CircleUserRound, primario: false },
  ];

  const itensMobileAdmin = gruposAdmin.flatMap(g => g.itens).slice(0, 4);

  const fechar = () => abrir(false);
  const nomeMarca = marca?.nome ?? "Studio Soldado do Corte";

  return (
    <>
      <a href="#conteudo" className="skip-link">Ir para o conteúdo</a>
      <div className="route-sweep" key={`sweep-${pathname}`} aria-hidden="true" />

      <header className={`topbar${menuAdmin ? " topbar--admin" : ""}`}>
        <div className={`topbar-inner ${menuAdmin ? "container-admin" : "container-app"}`}>
          <Link className="brand-link" to={sessao ? rotaPadraoSessao(sessao) : "/inicio"} aria-label={nomeMarca} onClick={fechar}>
            {logo ? (
              <span className={`brand-logo-wrap${wordmarkIntegrado ? " brand-logo-wrap--wordmark" : ""}`}>
                <img src={logo} alt={nomeMarca} />
              </span>
            ) : (
              <span className="brand-fallback-icon"><Scissors size={17} strokeWidth={1.75} /></span>
            )}
            <span className={wordmarkIntegrado ? "sr-only" : "brand-name"}>{nomeMarca}</span>
          </Link>

          <nav className={`topnav${aberto ? " topnav--open" : ""}${menuAdmin ? " topnav--admin-mobile" : ""}`} aria-label="Menu principal" id="menu-principal">
            {menuAdmin ? (
              gruposAdmin.map(grupo => (
                <div key={grupo.titulo} className="topnav-admin-group">
                  <span className="topnav-admin-label">{grupo.titulo}</span>
                  {grupo.itens.map(([rota, nome, Icone]) => (
                    <NavLink key={rota} to={rota} onClick={fechar}><Icone size={15} strokeWidth={1.75} /> {nome}</NavLink>
                  ))}
                </div>
              ))
            ) : (
              <>
                {exibirNavCliente && (
                  <>
                    <NavLink to="/inicio" viewTransition onClick={fechar} className={({ isActive }) => (isActive || pathname === "/" ? "active" : "")}>Início</NavLink>
                    <NavLink to="/catalogo" viewTransition onClick={fechar}>Serviços</NavLink>
                    <NavLink to="/equipe" viewTransition onClick={fechar}>Profissionais</NavLink>
                    <NavLink to="/agendar" viewTransition onClick={fechar}>Agendar</NavLink>
                    {ehCliente && <NavLink to="/meus-horarios" viewTransition onClick={fechar}>Horários</NavLink>}
                    {(!sessao || ehCliente) && <NavLink to="/fidelidade" viewTransition onClick={fechar}>Fidelidade</NavLink>}
                    <NavLink to="/galeria" viewTransition onClick={fechar}>Galeria</NavLink>
                  </>
                )}
                {podeVerPainel && <NavLink to="/painel" onClick={fechar}><LayoutDashboard size={15} strokeWidth={1.75} /> Visão geral</NavLink>}
                {podeVerAgendaEquipe && (
                  <NavLink to="/agenda" onClick={fechar}>
                    <CalendarDays size={15} strokeWidth={1.75} /> {podeVerPainel ? "Agenda" : "Minha agenda"}
                  </NavLink>
                )}
                {podeVerPainel && <NavLink to="/desempenho" onClick={fechar}><BarChart3 size={15} strokeWidth={1.75} /> Desempenho</NavLink>}
                {itensDropdown.length > 0 && (
                  <details className="admin-dropdown" key={pathname}>
                    <summary>Gestão <ChevronDown size={14} strokeWidth={1.75} /></summary>
                    <div className="admin-dropdown-menu">
                      {itensDropdown.map(([rota, nome]) => (
                        <NavLink key={rota} to={rota} onClick={fechar}>{nome}</NavLink>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
            {sessao && <NavLink to="/perfil" onClick={fechar}><CircleUserRound size={15} strokeWidth={1.75} /> Perfil</NavLink>}
          </nav>

          <div className="topbar-actions">
            {sessao && <NotificacoesBell />}
            {menuAdmin && (
              <>
                <Link to="/inicio" className="btn btn--fantasma btn--compacto admin-topbar-util">
                  <ExternalLink size={14} strokeWidth={1.75} /><span>Vitrine</span>
                </Link>
                <Link to="/perfil" className="btn btn--fantasma btn--compacto admin-topbar-util">
                  <CircleUserRound size={15} strokeWidth={1.75} /><span>Perfil</span>
                </Link>
              </>
            )}
            {sessao ? (
              <button type="button" className="btn btn--neutro btn--compacto topbar-logout" aria-label="Sair" onClick={() => void logout()}>
                <LogOut size={15} strokeWidth={1.75} /><span className="topbar-logout-label">Sair</span>
              </button>
            ) : (
              pathname !== "/login" && pathname !== "/cadastro" && (
                <Link to="/login" className="btn btn--neutro btn--compacto">Entrar</Link>
              )
            )}
            <button type="button" className="icon-btn menu-toggle" aria-expanded={aberto} aria-controls="menu-principal" aria-label={aberto ? "Fechar menu" : "Abrir menu"} onClick={() => abrir(!aberto)}>
              {aberto ? <X size={18} strokeWidth={1.75} /> : <Menu size={18} strokeWidth={1.75} />}
            </button>
          </div>
        </div>
      </header>

      <main id="conteudo" className={`app-main ${menuAdmin ? "container-admin admin-layout" : "container-app"}`}>
        {menuAdmin && (
          <aside className="admin-rail">
            <nav aria-label="Administração" className="admin-rail-groups">
              {gruposAdmin.map(grupo => (
                <div className="admin-rail-group" key={grupo.titulo}>
                  <div className="admin-rail-label">{grupo.titulo}</div>
                  {grupo.itens.map(([rota, nome, Icone]) => (
                    <NavLink to={rota} key={rota}><Icone size={16} strokeWidth={1.75} /><span>{nome}</span></NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </aside>
        )}
        <div className="stage-viewport">
          <div className="route-stage" data-dir={direcao} key={pathname}>
            <Outlet />
          </div>
        </div>
      </main>

      {exibirNavCliente && !menuAdmin && (
        <nav className="bottom-nav" aria-label="Navegação rápida">
          {itensMobile.map(({ rota, nome, Icone, primario }) => {
            const inicioAtivo = rota === "/inicio" && pathname === "/";
            return (
              <NavLink
                key={rota}
                to={rota}
                viewTransition
                className={({ isActive }) => `${isActive || inicioAtivo ? "active" : ""}${primario ? " bottom-nav-primary" : ""}`.trim()}
                aria-current={inicioAtivo ? "page" : undefined}
                onClick={fechar}
              >
                <span className="bottom-nav-pill"><Icone size={18} strokeWidth={1.75} /></span>
                <small>{nome}</small>
              </NavLink>
            );
          })}
        </nav>
      )}

      {menuAdmin && itensMobileAdmin.length > 0 && (
        <nav className="bottom-nav bottom-nav--admin" aria-label="Navegação administrativa rápida">
          {itensMobileAdmin.map(([rota, nome, Icone]) => (
            <NavLink
              key={rota}
              to={rota}
              className={({ isActive }) => (isActive ? "active" : "")}
              onClick={fechar}
            >
              <span className="bottom-nav-pill"><Icone size={17} strokeWidth={1.75} /></span>
              <small>{nome}</small>
            </NavLink>
          ))}
        </nav>
      )}
    </>
  );
}
