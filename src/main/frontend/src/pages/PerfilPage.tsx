import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CalendarDays, Gift, UserRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Aviso, Campo, Titulo } from "../components/Interface";
import Botao from "../components/Botao";
import api from "../services/api";
import { sair, obterSessao, salvarSessao, temPapel } from "../services/auth";
import { dataHora, instanteAgenda, mensagem, statusTexto } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import type { Agendamento, Cartao } from "../types/Barbearia";
import type { Usuario } from "../types/Usuario";

function FormPerfil({ u }: { u: Usuario }) {
  const [nome, setNome] = useState(u.nome);
  const [email, setEmail] = useState(u.email);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [feedback, setFeedback] = useState<{ erro?: string; sucesso?: string }>({});
  const [ocupado, setOcupado] = useState(false);
  const navigate = useNavigate();
  async function salvar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true); setFeedback({});
    try {
      await api.put("/perfil", { nome, email, senhaAtual, novaSenha });
      if (novaSenha) { sair(); navigate("/login", { replace: true }); return; }
      const sessao = obterSessao();
      if (sessao) salvarSessao({ ...sessao, nome });
      setFeedback({ sucesso: "Perfil atualizado." });
    } catch (e) { setFeedback({ erro: mensagem(e) }); }
    finally { setOcupado(false); }
  }
  return <form className="panel form-stack form-narrow" onSubmit={salvar}>
    <Aviso {...feedback} />
    <Campo nome="Usuário"><input value={u.username} readOnly /></Campo>
    <Campo nome="Nome"><input value={nome} onChange={e => setNome(e.target.value)} required maxLength={100} /></Campo>
    <Campo nome="E-mail"><input value={email} onChange={e => setEmail(e.target.value)} required type="email" /></Campo>
    <h2>Alterar senha</h2>
    <Campo nome="Senha atual"><input value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} type="password"
      autoComplete="current-password" required={Boolean(novaSenha)} maxLength={72} /></Campo>
    <Campo nome="Nova senha"><input value={novaSenha} onChange={e => setNovaSenha(e.target.value)} type="password"
      autoComplete="new-password" minLength={8} maxLength={72} /></Campo>
    <Botao type="submit" disabled={ocupado}>Salvar perfil</Botao>
  </form>;
}

export default function PerfilPage() {
  const u = useConsulta<Usuario>("/perfil");
  const cliente = temPapel("CLIENTE");
  const ag = useConsulta<Agendamento[]>(cliente ? "/agendamentos" : null);
  const cartao = useConsulta<Cartao>(cliente ? "/fidelidade" : null);
  const proximos = ag.dados?.filter(a => ["RESERVADO", "CONFIRMADO"].includes(a.status) && instanteAgenda(a.inicio) > Date.now());
  const proximo = proximos?.at(-1);
  const ultimos = ag.dados?.filter(a => !proximos?.some(p => p.id === a.id)).slice(0, 2);
  const navegar = useNavigate();
  return <section className="studio-page studio-account stack"><Titulo titulo="Minha conta" />
    <Aviso erro={u.erro || ag.erro || cartao.erro} carregando={u.carregando || ag.carregando || cartao.carregando} />
    {u.dados && <div className="panel studio-inline-card"><span className="large-icon"><UserRound size={22} /></span>
      <span><strong>{u.dados.nome}</strong><small className="muted">{u.dados.email}</small></span></div>}
    {cliente && <>
      <section className="panel stack">
        <div className="section-heading"><h2>Próximo atendimento</h2><Link className="studio-text-link" to="/meus-horarios">Meus horários <ArrowRight size={15} /></Link></div>
        {proximo ? <div className="studio-inline-card"><CalendarDays size={20} className="accent" /><span><strong>{proximo.servico}</strong>
          <small>{dataHora(proximo.inicio)} · {proximo.barbeiro}</small></span><span className="status">{statusTexto[proximo.status]}</span></div>
          : <p className="muted">Você ainda não tem um próximo horário.</p>}
      </section>
      {!!ultimos?.length && <section className="panel stack"><h2>Histórico recente</h2>{ultimos.map(a => <div className="list-row" key={a.id}>
        <span><strong>{a.servico}</strong><p className="muted">{dataHora(a.inicio)}</p></span><span className="status">{statusTexto[a.status]}</span>
      </div>)}</section>}
      {cartao.dados && <Link to="/fidelidade" className="panel studio-inline-card"><span className="large-icon"><Gift size={20} /></span>
        <span><strong>Fidelidade</strong><small>{cartao.dados.progresso} de {cartao.dados.meta} atendimentos elegíveis</small></span><ArrowRight size={17} /></Link>}
    </>}
    {u.dados && <details className="panel studio-info ajustes-conta"><summary>Editar dados e senha</summary><FormPerfil u={u.dados} /></details>}
    <Botao variante="neutro" onClick={async () => {
      try { await api.post("/logout"); } catch { /* A sessão local ainda é encerrada. */ } finally { sair(); navegar("/login", { replace: true }); }
    }}>Sair da conta</Botao>
  </section>;
}
