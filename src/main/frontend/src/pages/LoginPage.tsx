import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, Scissors } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { salvarSessao, type Sessao } from "../services/auth";
import { mensagem } from "../services/formato";
import Botao from "../components/Botao";
import { Aviso, Campo } from "../components/Interface";
import { useMarca } from "../components/useMarca";

export default function LoginPage({ cadastro = false }: { cadastro?: boolean }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { state } = useLocation();
  const navigate = useNavigate();
  const { marca } = useMarca();

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true); setErro("");
    try {
      if (cadastro) await api.post("/cadastro", { nome, email, username, senha });
      const { data } = await api.post<Sessao>("/login", { username, senha });
      salvarSessao(data);
      const equipe = data.permissoes.some(p => p === "ADMIN" || p === "BARBEIRO");
      navigate(equipe ? (data.permissoes.includes("ADMIN") ? "/painel" : "/agenda") : state?.destino ?? "/meus-horarios", { replace: true });
    } catch (e) { setErro(mensagem(e)); }
    finally { setOcupado(false); }
  }

  return <section className="auth-wrap">
    <form onSubmit={enviar} className="panel auth-card">
      {marca?.logo ? <img className="auth-logo" src={marca.demonstracao && marca.logo === "/api/publico/logo?v=1" ? "/studio/marca.png" : marca.logo} alt={marca.nome} /> : <span className="large-icon"><Scissors size={26} /></span>}
      <h1>{cadastro ? "Crie sua conta" : "Entre na sua conta"}</h1>
      <p className="muted">{cadastro ? "Agende e acompanhe seus próximos atendimentos." : marca?.nome}</p>
      <Aviso erro={erro} />
      {cadastro && <>
        <Campo nome="Nome"><input autoComplete="name" value={nome} required maxLength={100} onChange={e => setNome(e.target.value)} /></Campo>
        <Campo nome="E-mail"><input autoComplete="email" type="email" value={email} required onChange={e => setEmail(e.target.value)} /></Campo>
      </>}
      <Campo nome="Usuário"><input autoComplete="username" autoCapitalize="none" value={username} required
        minLength={3} maxLength={40} onChange={e => setUsername(e.target.value)} /></Campo>
      <Campo nome="Senha"><input autoComplete={cadastro ? "new-password" : "current-password"} type="password"
        value={senha} required minLength={cadastro ? 8 : undefined} maxLength={72} onChange={e => setSenha(e.target.value)} /></Campo>
      <Botao type="submit" disabled={ocupado}>{ocupado ? "Aguarde…" : cadastro ? "Cadastrar" : "Entrar"} <ArrowRight size={17} /></Botao>
      <p className="auth-link">{cadastro ? "Já tem uma conta?" : "Primeiro acesso?"}{" "}
        <Link to={cadastro ? "/login" : "/cadastro"} state={state}>{cadastro ? "Entre" : "Cadastre-se"}</Link></p>
    </form>
  </section>;
}
