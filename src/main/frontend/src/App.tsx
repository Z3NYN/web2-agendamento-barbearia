import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import { MarcaProvider } from "./components/MarcaContext";
import Home from "./pages/Home";
import LandingPage from "./pages/LandingPage";
import PainelPage from "./pages/PainelPage";
import DesempenhoPage from "./pages/DesempenhoPage";
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
import { obterSessao, obterToken, rotaPadraoSessao, temAlgumaPermissao, temPapel } from "./services/auth";
import { Titulo } from "./components/Interface";

function RotaInicial() {
  const sessao = obterSessao();
  const autenticado = Boolean(obterToken() && sessao);
  if (!autenticado) return <LandingPage />;
  const destino = rotaPadraoSessao(sessao);
  if (destino !== "/inicio") return <Navigate to={destino} replace />;
  return <Home />;
}

function RequireAuth({ papeis, permissoes }: { papeis?: string[]; permissoes?: string[] }) {
  const { pathname, search } = useLocation();
  if (!obterToken()) return <Navigate to="/login" state={{ destino: pathname + search }} replace />;
  const exigeRestricao = Boolean(papeis?.length || permissoes?.length);
  const permitido = !exigeRestricao
    || Boolean(papeis?.some(temPapel))
    || Boolean(permissoes?.length && temAlgumaPermissao(...permissoes));
  if (!permitido) {
    return <Titulo titulo="Acesso restrito" detalhe="Suas permissões atuais não autorizam o acesso a esta página." />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <MarcaProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<RotaInicial />} />
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

          <Route element={<RequireAuth papeis={["BARBEIRO"]} permissoes={["AGENDAMENTOS_CONSULTAR", "AGENDAMENTOS_GERENCIAR", "AGENDAMENTOS_CONFIRMAR_CONCLUIR"]} />}>
            <Route path="agenda" element={<AgendaPage equipe />} />
          </Route>

          <Route element={<RequireAuth permissoes={["DASHBOARD_ANALITICO"]} />}>
            <Route path="painel" element={<PainelPage />} />
            <Route path="desempenho" element={<DesempenhoPage />} />
          </Route>

          <Route element={<RequireAuth permissoes={["SERVICOS_GERENCIAR"]} />}>
            <Route path="servicos" element={<ServicosPage />} />
          </Route>

          <Route element={<RequireAuth permissoes={["PROFISSIONAIS_GERENCIAR"]} />}>
            <Route path="profissionais" element={<ProfissionaisPage />} />
          </Route>

          <Route element={<RequireAuth permissoes={["DISPONIBILIDADE_GERENCIAR"]} />}>
            <Route path="expediente" element={<ExpedientePage />} />
          </Route>

          <Route element={<RequireAuth permissoes={["CLIENTES_GERENCIAR", "FIDELIDADE_ADMINISTRAR"]} />}>
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="clientes/:id" element={<ClientePage />} />
          </Route>

          <Route element={<RequireAuth permissoes={["FIDELIDADE_ADMINISTRAR"]} />}>
            <Route path="fidelidade-programa" element={<MarcaPage modo="fidelidade" />} />
          </Route>

          <Route element={<RequireAuth permissoes={["MARCA_PERSONALIZAR", "GALERIA_GERENCIAR", "FIDELIDADE_ADMINISTRAR"]} />}>
            <Route path="marca" element={<MarcaPage />} />
          </Route>

          <Route element={<RequireAuth permissoes={["USUARIOS_GERENCIAR"]} />}>
            <Route path="usuarios" element={<UsuariosPage />} />
            <Route path="usuarios/:id" element={<UsuarioDetailPage />} />
          </Route>

          <Route element={<RequireAuth permissoes={["PERMISSOES_GERENCIAR"]} />}>
            <Route path="permissoes" element={<PermissoesPage />} />
            <Route path="permissoes/:id" element={<PermissaoDetailPage />} />
          </Route>

          <Route element={<RequireAuth permissoes={["ACESSOS_ATRIBUIR"]} />}>
            <Route path="atribuir-permissoes" element={<UsuarioPermissoesPage />} />
          </Route>

          <Route path="*" element={<Titulo titulo="Página não encontrada" detalhe="O endereço acessado não existe." />} />
        </Route>
      </Routes>
    </MarcaProvider>
  );
}
