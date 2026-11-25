import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { MarcaProvider } from "./components/MarcaContext";
import Home from "./pages/Home";
import PainelPage from "./pages/PainelPage";
import { EquipePublica, GaleriaPage, ServicosPublicos } from "./pages/VitrinePages";
import LoginPage from "./pages/LoginPage";
import UsuariosPage from "./pages/UsuariosPage";
import UsuarioDetailPage from "./pages/UsuarioDetailPage";
import UsuarioPermissoesPage from "./pages/UsuarioPermissoesPage";
import PermissoesPage from "./pages/PermissoesPage";
import PermissaoDetailPage from "./pages/PermissaoDetailPage";
import AgendarPage from "./pages/AgendarPage";
import AgendaPage from "./pages/AgendaPage";
import FidelidadePage from "./pages/FidelidadePage";
import PerfilPage from "./pages/PerfilPage";
import { ServicosPage, ProfissionaisPage, ExpedientePage } from "./pages/CatalogoPages";
import { ClientesPage, ClientePage } from "./pages/ClientesPage";
import MarcaPage from "./pages/MarcaPage";
import { obterToken, temPapel } from "./services/auth";
import { Titulo } from "./components/Interface";

function RequireAuth({ papeis }: { papeis?: string[] }) {
  const { pathname, search } = useLocation();
  if (!obterToken()) return <Navigate to="/login" state={{ destino: pathname + search }} replace />;
  if (papeis && !papeis.some(temPapel)) return <Titulo titulo="Acesso restrito" detalhe="Seu perfil não tem acesso a esta página." />;
  return <Outlet />;
}

export default function App() {
  return <MarcaProvider><Routes><Route element={<Layout />}>
    <Route index element={<Home />} />
    <Route path="inicio" element={<Home />} />
    <Route path="catalogo" element={<ServicosPublicos />} />
    <Route path="equipe" element={<EquipePublica />} />
    <Route path="equipe/:id" element={<EquipePublica />} />
    <Route path="galeria" element={<GaleriaPage />} />
    <Route path="login" element={<LoginPage />} />
    <Route path="cadastro" element={<LoginPage cadastro />} />
    <Route path="agendar" element={<AgendarPage />} />
    <Route element={<RequireAuth papeis={["CLIENTE"]} />}>
      <Route path="meus-horarios" element={<AgendaPage />} />
      <Route path="fidelidade" element={<FidelidadePage />} />
    </Route>
    <Route element={<RequireAuth />}>
      <Route path="perfil" element={<PerfilPage />} />
    </Route>
    <Route element={<RequireAuth papeis={["ADMIN", "BARBEIRO"]} />}>
      <Route path="agenda" element={<AgendaPage equipe />} />
    </Route>
    <Route element={<RequireAuth papeis={["ADMIN"]} />}>
      <Route path="painel" element={<PainelPage />} />
      <Route path="servicos" element={<ServicosPage />} />
      <Route path="profissionais" element={<ProfissionaisPage />} />
      <Route path="expediente" element={<ExpedientePage />} />
      <Route path="clientes" element={<ClientesPage />} />
      <Route path="clientes/:id" element={<ClientePage />} />
      <Route path="marca" element={<MarcaPage />} />
      <Route path="usuarios" element={<UsuariosPage />} />
      <Route path="usuarios/:id" element={<UsuarioDetailPage />} />
      <Route path="atribuir-permissoes" element={<UsuarioPermissoesPage />} />
      <Route path="permissoes" element={<PermissoesPage />} />
      <Route path="permissoes/:id" element={<PermissaoDetailPage />} />
    </Route>
    <Route path="*" element={<Titulo titulo="Página não encontrada" />} />
  </Route></Routes></MarcaProvider>;
}
