import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { rotaPadraoSessao, salvarSessao, type Sessao } from "../services/auth";
import { sincronizarPushSessao } from "../services/pwa";
import { mensagem } from "../services/formato";
import Botao from "../components/Botao";
import { Aviso, Campo } from "../components/Interface";

export default function LoginPage({ cadastro = false }: { cadastro?: boolean }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const { state } = useLocation();
  const navigate = useNavigate();

  async function enviar(e: FormEvent) {
    e.preventDefault(); setOcupado(true); setErro("");
    try {
      if (cadastro) await api.post("/cadastro", { nome, email, username, senha });
      const { data } = await api.post<Sessao>("/login", { username, senha });
      salvarSessao(data);
      void sincronizarPushSessao();
      const padrao = rotaPadraoSessao(data);
      const destino = (state as { destino?: string } | null)?.destino;
      navigate(padrao !== "/inicio" ? padrao : destino ?? "/inicio", { replace: true });
    } catch (err) { setErro(mensagem(err)); }
    finally { setOcupado(false); }
  }

  return (
    <section className="auth-wrap">
      <form onSubmit={enviar} className="surface-card auth-card">
        <div className="stack-xs">
          <h1>{cadastro ? "Crie sua conta" : "Entrar"}</h1>
          <p className="text-secondary">{cadastro ? "Agende horários, acompanhe seu cartão fidelidade e repita cortes em segundos." : "Acesse sua conta para gerenciar horários e fidelidade."}</p>
        </div>
        <Aviso erro={erro} />
        {cadastro && (
          <>
            <Campo nome="Nome completo"><input autoComplete="name" value={nome} required maxLength={100} onChange={e => setNome(e.target.value)} /></Campo>
            <Campo nome="E-mail"><input autoComplete="email" type="email" value={email} required onChange={e => setEmail(e.target.value)} /></Campo>
          </>
        )}
        <Campo nome="Usuário"><input autoComplete="username" autoCapitalize="none" value={username} required minLength={3} maxLength={40} onChange={e => setUsername(e.target.value)} /></Campo>
        <Campo nome="Senha" dica={cadastro ? "Mínimo de 8 caracteres." : undefined}><input autoComplete={cadastro ? "new-password" : "current-password"} type="password" value={senha} required minLength={cadastro ? 8 : undefined} maxLength={72} onChange={e => setSenha(e.target.value)} /></Campo>
        <Botao type="submit" className="btn--full" disabled={ocupado}>{ocupado ? "Aguarde…" : cadastro ? "Criar conta" : "Entrar"} <ArrowRight size={16} strokeWidth={1.9} /></Botao>
        <p className="auth-switch">{cadastro ? "Já possui conta?" : "Primeiro acesso?"}{" "}<Link to={cadastro ? "/login" : "/cadastro"} state={state}>{cadastro ? "Entrar" : "Cadastre-se"}</Link></p>
      </form>
    </section>
  );
}
