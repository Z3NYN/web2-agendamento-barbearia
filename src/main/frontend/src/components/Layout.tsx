import { CalendarDays, CalendarPlus, ChevronDown, CircleUserRound, Clock3, Gift, Home as Inicio, LayoutDashboard, LogOut, Palette, UsersRound, Menu, Scissors, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { obterSessao, sair, temPapel } from "../services/auth";
import { useMarca } from "./useMarca";

export default function Layout() {
  const [aberto, abrir] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { marca } = useMarca();
  const sessao = obterSessao();
  const equipe = temPapel("ADMIN") || temPapel("BARBEIRO");
  const admin = temPapel("ADMIN");

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [pathname]);

  async function logout() {
    try { await api.post("/logout"); } catch { /* A sessão local sempre é encerrada. */ }
    finally { sair(); abrir(false); navigate("/login", { replace: true }); }
  }

  const adminRotas = ["/painel", "/agenda", "/clientes", "/servicos", "/profissionais", "/expediente", "/marca", "/usuarios", "/permissoes", "/atribuir-permissoes"];
  const menuAdmin = admin && adminRotas.some(r => pathname === r || pathname.startsWith(r + "/"));
  const secoesAdmin = [
    ["/painel", "Visão geral", LayoutDashboard], ["/agenda", "Agenda", CalendarDays],
    ["/clientes", "Clientes", UsersRound], ["/servicos", "Serviços", Scissors],
    ["/profissionais", "Profissionais", CircleUserRound], ["/expediente", "Expediente", Clock3],
    ["/marca", "Personalização", Palette], ["/usuarios", "Usuários", UsersRound],
    ["/permissoes", "Permissões", Gift], ["/atribuir-permissoes", "Acessos", Gift],
  ] as const;
  const fechar = () => abrir(false);
  const itens = [
    { rota: "/inicio", nome: "Início", Icone: Inicio },
    { rota: "/agendar", nome: "Agendar", Icone: CalendarPlus },
    { rota: "/meus-horarios", nome: "Horários", Icone: Clock3 },
    { rota: "/fidelidade", nome: "Fidelidade", Icone: Gift },
    { rota: "/perfil", nome: "Conta", Icone: CircleUserRound },
  ];
  return <>
    <a href="#conteudo" className="skip">Ir para o conteúdo</a>
    <header className="site-header">
      <div className="site-header-inner shell">
        <Link className="wordmark" to="/inicio" onClick={fechar}>
          <span className="wordmark-icon">{marca?.logo ? <img src={marca.demonstracao && marca.logo === "/api/publico/logo?v=1" ? "/studio/marca.png" : marca.logo} alt="" /> : <Scissors size={20} strokeWidth={1.7} />}</span>
          <span>{marca?.nome ?? "Studio Soldado do Corte"}</span>
        </Link>
        <nav className={`site-nav ${aberto ? "site-nav--open" : ""}`} aria-label="Menu principal" id="menu-principal">
          {!equipe && <NavLink to="/catalogo" onClick={fechar}>Serviços</NavLink>}
          {!equipe && <NavLink to="/equipe" onClick={fechar}>Equipe</NavLink>}
          {admin && <NavLink to="/painel" onClick={fechar}><LayoutDashboard size={16} /> Visão geral</NavLink>}
          {equipe ? <NavLink to="/agenda" onClick={fechar}><CalendarDays size={16} /> Agenda</NavLink> : <>
            <NavLink to="/agendar" onClick={fechar}><CalendarPlus size={16} /> Agendar</NavLink>
            <NavLink to="/meus-horarios" onClick={fechar}><Clock3 size={16} /> Meus horários</NavLink>
            <NavLink to="/fidelidade" onClick={fechar}><Gift size={16} /> Fidelidade</NavLink>
          </>}
          {admin && <details className="admin-menu" key={pathname}>
            <summary>Gestão <ChevronDown size={15} /></summary>
            <div>
              <NavLink to="/servicos" onClick={fechar}>Serviços</NavLink>
              <NavLink to="/profissionais" onClick={fechar}>Profissionais</NavLink>
              <NavLink to="/expediente" onClick={fechar}>Expediente e bloqueios</NavLink>
              <NavLink to="/clientes" onClick={fechar}>Clientes</NavLink>
              <NavLink to="/marca" onClick={fechar}>Marca e fidelidade</NavLink>
              <NavLink to="/usuarios" onClick={fechar}>Usuários</NavLink>
              <NavLink to="/permissoes" onClick={fechar}>Permissões</NavLink>
              <NavLink to="/atribuir-permissoes" onClick={fechar}>Atribuir permissões</NavLink>
            </div>
          </details>}
          {sessao && <NavLink to="/perfil" onClick={fechar}><CircleUserRound size={16} /> Perfil</NavLink>}
        </nav>
        <div className="header-actions">
          {sessao ? <button type="button" className="button button--neutro" onClick={() => void logout()}><LogOut size={16} /> Sair</button>
            : <Link to="/login" className="button button--neutro">Entrar</Link>}
          <button type="button" className="menu-toggle" aria-expanded={aberto} aria-controls="menu-principal"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"} onClick={() => abrir(!aberto)}>{aberto ? <X /> : <Menu />}</button>
        </div>
      </div>
    </header>
    <main id="conteudo" className={`shell site-main ${menuAdmin ? "studio-admin-layout" : ""}`}>
      {menuAdmin && <aside className="studio-admin-rail"><nav aria-label="Administração">{secoesAdmin.map(([r, nome, Icone]) =>
        <NavLink to={r} key={r}><Icone size={17} /> {nome}</NavLink>)}</nav></aside>}
      <div className="route-view" key={pathname}><Outlet /></div>
    </main>
    {!equipe && <nav className="bottom-nav" aria-label="Navegação rápida">
      {itens.map(({ rota, nome, Icone }) => <NavLink key={rota} to={rota} className={rota === "/inicio" && pathname === "/" ? "active" : undefined}
        aria-current={rota === "/inicio" && pathname === "/" ? "page" : undefined} onClick={fechar}>
        <span><Icone size={19} /></span><small>{nome}</small></NavLink>)}
    </nav>}
  </>;
}
