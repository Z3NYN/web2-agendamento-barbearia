import {
  CalendarDays, CalendarPlus, ChevronDown, CircleUserRound, Clock3, ExternalLink,
  Gift, Home as InicioIcon, KeyRound, LayoutDashboard, LogOut, Menu, Palette,
  Scissors, Shield, UsersRound, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { obterSessao, sair, temPapel } from "../services/auth";
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
  const equipe = temPapel("ADMIN") || temPapel("BARBEIRO");
  const admin = temPapel("ADMIN");
  const logo = logoMarca(marca);
  const wordmarkIntegrado = ehWordmarkOficial(logo);

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
      navigate("/login", { replace: true });
    }
  }

  if (aberturaImersiva) {
    return <main id="conteudo" className="splash-shell"><Outlet /></main>;
  }

  const adminRotas = [
    "/painel", "/agenda", "/clientes", "/servicos", "/profissionais",
    "/expediente", "/marca", "/usuarios", "/permissoes", "/atribuir-permissoes",
  ];
  const menuAdmin = admin && adminRotas.some(r => pathname === r || pathname.startsWith(r + "/"));

  const gruposAdmin = [
    { titulo: "Operação", itens: [["/painel", "Dashboard", LayoutDashboard], ["/agenda", "Agenda", CalendarDays], ["/clientes", "Clientes", UsersRound]] as const },
    { titulo: "Barbearia", itens: [["/servicos", "Serviços", Scissors], ["/profissionais", "Profissionais", CircleUserRound], ["/expediente", "Expediente", Clock3], ["/marca", "Personalização", Palette]] as const },
    { titulo: "Sistema", itens: [["/usuarios", "Usuários", UsersRound], ["/permissoes", "Permissões", Shield], ["/atribuir-permissoes", "Acessos", KeyRound]] as const },
  ];

  const itensMobile = [
    { rota: "/inicio", nome: "Início", Icone: InicioIcon, primario: false },
    { rota: "/catalogo", nome: "Serviços", Icone: Scissors, primario: false },
    { rota: "/agendar", nome: "Agendar", Icone: CalendarPlus, primario: true },
    { rota: "/fidelidade", nome: "Fidelidade", Icone: Gift, primario: false },
    { rota: "/perfil", nome: "Perfil", Icone: CircleUserRound, primario: false },
  ];

  const fechar = () => abrir(false);
  const nomeMarca = marca?.nome ?? "Studio Soldado do Corte";

  return (
    <>
      <a href="#conteudo" className="skip-link">Ir para o conteúdo</a>
      <div className="route-sweep" key={`sweep-${pathname}`} aria-hidden="true" />

      <header className={`topbar${menuAdmin ? " topbar--admin" : ""}`}>
        <div className={`topbar-inner ${menuAdmin ? "container-admin" : "container-app"}`}>
          <Link className="brand-link" to={admin ? "/painel" : equipe ? "/agenda" : "/inicio"} aria-label={nomeMarca} onClick={fechar}>
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
            {!equipe && (
              <>
                <NavLink to="/inicio" viewTransition onClick={fechar} className={({ isActive }) => (isActive || pathname === "/" ? "active" : "")}>Início</NavLink>
                <NavLink to="/catalogo" viewTransition onClick={fechar}>Serviços</NavLink>
                <NavLink to="/equipe" viewTransition onClick={fechar}>Profissionais</NavLink>
                <NavLink to="/agendar" viewTransition onClick={fechar}>Agendar</NavLink>
                {sessao && <NavLink to="/meus-horarios" viewTransition onClick={fechar}>Horários</NavLink>}
                <NavLink to="/fidelidade" viewTransition onClick={fechar}>Fidelidade</NavLink>
                <NavLink to="/galeria" viewTransition onClick={fechar}>Galeria</NavLink>
              </>
            )}
            {admin && <NavLink to="/painel" onClick={fechar}><LayoutDashboard size={15} strokeWidth={1.75} /> Dashboard</NavLink>}
            {equipe && <NavLink to="/agenda" onClick={fechar}><CalendarDays size={15} strokeWidth={1.75} /> {admin ? "Agenda" : "Minha agenda"}</NavLink>}
            {admin && (
              <details className="admin-dropdown" key={pathname}>
                <summary>Gestão <ChevronDown size={14} strokeWidth={1.75} /></summary>
                <div className="admin-dropdown-menu">
                  <NavLink to="/servicos" onClick={fechar}>Serviços</NavLink>
                  <NavLink to="/profissionais" onClick={fechar}>Profissionais</NavLink>
                  <NavLink to="/expediente" onClick={fechar}>Expediente e bloqueios</NavLink>
                  <NavLink to="/clientes" onClick={fechar}>Clientes</NavLink>
                  <NavLink to="/marca" onClick={fechar}>Personalização</NavLink>
                  <NavLink to="/usuarios" onClick={fechar}>Usuários</NavLink>
                  <NavLink to="/permissoes" onClick={fechar}>Permissões</NavLink>
                  <NavLink to="/atribuir-permissoes" onClick={fechar}>Atribuir permissões</NavLink>
                </div>
              </details>
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

      {!equipe && (
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
    </>
  );
}
