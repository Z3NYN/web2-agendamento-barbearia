import { useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, CalendarDays, ChevronRight, Gift, LogOut, RotateCcw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Aviso, Campo, SkeletonList, Titulo } from "../components/Interface";
import { Expansivel } from "../components/Experiencia";
import Botao from "../components/Botao";
import api from "../services/api";
import { sair, obterSessao, salvarSessao, temPapel } from "../services/auth";
import { cancelarWebPush, limparInscricaoPushLocal } from "../services/pwa";
import { compararInicioAsc, compararInicioDesc, dataHora, iniciais, instanteAgenda, mensagem, statusTexto } from "../services/formato";
import { useAgora } from "../services/useAgora";
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
    e.preventDefault(); setOcupado(true); setFeedback({});
    try {
      await api.put("/perfil", { nome, email, senhaAtual, novaSenha });
      if (novaSenha) { void limparInscricaoPushLocal(); sair(); navigate("/login", { replace: true }); return; }
      const sessao = obterSessao();
      if (sessao) salvarSessao({ ...sessao, nome });
      setFeedback({ sucesso: "Perfil atualizado." });
    } catch (err) { setFeedback({ erro: mensagem(err) }); }
    finally { setOcupado(false); }
  }

  return (
    <form className="form-stack settings-form" onSubmit={salvar}>
      <Aviso {...feedback} />
      <div className="form-grid-2">
        <Campo nome="Usuário"><input value={u.username} readOnly /></Campo>
        <Campo nome="Nome"><input value={nome} onChange={e => setNome(e.target.value)} required maxLength={100} /></Campo>
      </div>
      <Campo nome="E-mail"><input value={email} onChange={e => setEmail(e.target.value)} required type="email" /></Campo>
      <div className="form-divider">Alterar senha (opcional)</div>
      <div className="form-grid-2">
        <Campo nome="Senha atual"><input value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} type="password" autoComplete="current-password" required={Boolean(novaSenha)} maxLength={72} /></Campo>
        <Campo nome="Nova senha"><input value={novaSenha} onChange={e => setNovaSenha(e.target.value)} type="password" autoComplete="new-password" minLength={8} maxLength={72} /></Campo>
      </div>
      <div><Botao type="submit" disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar alterações"}</Botao></div>
    </form>
  );
}

export default function PerfilPage() {
  const agora = useAgora();
  const u = useConsulta<Usuario>("/perfil");
  const cliente = temPapel("CLIENTE");
  const ag = useConsulta<Agendamento[]>(cliente ? "/agendamentos" : null);
  const cartao = useConsulta<Cartao>(cliente ? "/fidelidade" : null);
  const navegar = useNavigate();

  const proximos = ag.dados?.filter(a => ["RESERVADO", "CONFIRMADO"].includes(a.status) && instanteAgenda(a.fim) > agora).toSorted(compararInicioAsc);
  const proximo = proximos?.[0];
  const proximosIds = new Set(proximos?.map(p => p.id) ?? []);
  const ultimos = ag.dados?.filter(a => !proximosIds.has(a.id)).toSorted(compararInicioDesc).slice(0, 3);
  const recompensasLivres = cartao.dados?.historico.filter(m => m.tipo === "RECOMPENSA" && !m.resgatadoEm && !m.agendamentoId) ?? [];

  async function encerrarSessao() {
    try {
      await cancelarWebPush();
      await api.post("/logout");
    } catch { /* Sessão local sempre encerrada. */ }
    finally {
      void limparInscricaoPushLocal();
      sair();
      navegar("/login", { replace: true });
    }
  }

  return (
    <section className="stack">
      <Titulo eyebrow="Conta" titulo="Meu Perfil" />
      <Aviso erro={u.erro || ag.erro || cartao.erro} aoTentarNovamente={u.erro ? u.recarregar : ag.erro ? ag.recarregar : cartao.erro ? cartao.recarregar : undefined} />
      {u.carregando && <SkeletonList quantidade={3} />}

      <div className="account-layout">
        <div className="stack">
          {u.dados && (
            <div className="surface-card profile-identity">
              <div className="avatar-lg">{iniciais(u.dados.nome)}</div>
              <div className="profile-identity-copy"><strong>{u.dados.nome}</strong><small>{u.dados.email}</small><span className="meta-chip">@{u.dados.username}</span></div>
            </div>
          )}

          {cliente ? (
            <nav className="surface-card profile-menu" aria-label="Atalhos da conta">
              <Link to="/meus-horarios" className="profile-menu-item">
                <span className="profile-menu-icon"><CalendarDays size={16} strokeWidth={1.75} /></span>
                <span className="profile-menu-copy"><strong>Meus agendamentos</strong><small>{proximos?.length ? `${proximos.length} ativo(s)` : "Consultar reservas e histórico"}</small></span>
                <ChevronRight size={16} strokeWidth={1.75} className="muted-arrow" />
              </Link>
              {cartao.dados && (
                <Link to="/fidelidade" className="profile-menu-item">
                  <span className="profile-menu-icon"><Gift size={16} strokeWidth={1.75} /></span>
                  <span className="profile-menu-copy"><strong>Fidelidade e recompensas</strong><small className="tabular">{cartao.dados.progresso} de {cartao.dados.meta} selos{recompensasLivres.length > 0 ? ` · ${recompensasLivres.length} pronta(s)` : ""}</small></span>
                  <ChevronRight size={16} strokeWidth={1.75} className="muted-arrow" />
                </Link>
              )}
              <button type="button" className="profile-menu-item profile-menu-item--danger" onClick={() => void encerrarSessao()}>
                <span className="profile-menu-icon"><LogOut size={16} strokeWidth={1.75} /></span>
                <span className="profile-menu-copy"><strong>Sair da conta</strong><small>Encerrar sessão neste dispositivo</small></span>
              </button>
            </nav>
          ) : (
            <div><Botao variante="neutro" onClick={() => void encerrarSessao()}><LogOut size={15} strokeWidth={1.75} /> Sair da conta</Botao></div>
          )}
        </div>

        <div className="stack">
          {cliente && (
            <>
              <section className="surface-card stack-sm">
                <div className="section-head"><h2>Próximo agendamento</h2><Link className="text-link" to="/meus-horarios">Ver todos <ArrowRight size={14} strokeWidth={1.75} /></Link></div>
                {proximo ? (
                  <div className="profile-appt-row">
                    <span className="icon-badge icon-badge--sm"><CalendarDays size={16} strokeWidth={1.75} /></span>
                    <div className="profile-appt-copy"><strong>{proximo.servico}</strong><small className="tabular">{dataHora(proximo.inicio)} · {proximo.barbeiro}</small></div>
                    <span className={`status-pill status-pill--${proximo.status.toLowerCase()}`}><i className="status-dot" aria-hidden="true" />{statusTexto[proximo.status]}</span>
                  </div>
                ) : (
                  <div className="profile-empty-row"><p className="text-secondary">Você ainda não tem um horário marcado.</p><Link to="/agendar" className="btn btn--primario btn--compacto">Agendar</Link></div>
                )}
              </section>

              {recompensasLivres.length > 0 && (
                <section className="surface-card surface-card--highlight stack-sm">
                  <div className="section-head"><h2>Recompensas disponíveis</h2><Link className="text-link" to="/fidelidade">Ver cartão <ArrowRight size={14} strokeWidth={1.75} /></Link></div>
                  <div className="list-panel">
                    {recompensasLivres.map(r => (
                      <div key={r.id} className="list-row">
                        <strong>{r.premio}</strong>
                        <Link className="btn btn--primario btn--compacto" to={`/agendar?servico=${r.servicoId}&premio=${r.id}`}>Resgatar <ArrowRight size={14} strokeWidth={1.9} /></Link>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {!!ultimos?.length && (
                <section className="surface-card stack-sm">
                  <h2>Histórico recente</h2>
                  <div className="list-panel">
                    {ultimos.map(a => (
                      <div className="list-row" key={a.id}>
                        <div className="list-copy"><strong>{a.servico}</strong><p className="text-secondary tabular">{dataHora(a.inicio)} · {a.barbeiro}</p></div>
                        <div className="inline-actions">
                          <span className={`status-pill status-pill--${a.status.toLowerCase()}`}><i className="status-dot" aria-hidden="true" />{statusTexto[a.status]}</span>
                          <Link to={`/agendar?servico=${a.servicoId}&profissional=${a.barbeiroId}`} className="btn btn--neutro btn--compacto"><RotateCcw size={13} strokeWidth={1.75} /> Repetir</Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {u.dados && <Expansivel titulo="Meus dados e senha" padraoAberto={!cliente}><FormPerfil u={u.dados} /></Expansivel>}
        </div>
      </div>
    </section>
  );
}
