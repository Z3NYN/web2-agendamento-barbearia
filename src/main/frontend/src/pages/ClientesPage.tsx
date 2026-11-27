import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import { compararInicioDesc, dataHora, iniciais, statusTexto } from "../services/formato";
import { CartaoFidelidade } from "./FidelidadePage";
import type { Agendamento, Cartao } from "../types/Barbearia";
import type { Usuario } from "../types/Usuario";

export function ClientesPage() {
  const consulta = useConsulta<Usuario[]>("/usuarios");
  const [busca, setBusca] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const clientes = consulta.dados?.filter(
    u => u.permissoes.some(p => p.nome === "CLIENTE") && (!busca.trim() || norm(u.nome + " " + u.email + " " + u.username).includes(norm(busca.trim())))
  );

  return (
    <section className="stack">
      <Titulo eyebrow="Gestão" titulo="Clientes" detalhe="Consulte cadastro, histórico de atendimentos e cartão fidelidade." />
      <div className="admin-toolbar-row">
        <label className="search-pill"><Search size={16} strokeWidth={1.75} /><input type="search" aria-label="Buscar clientes" placeholder="Buscar por nome, usuário ou e-mail" value={busca} onChange={e => setBusca(e.target.value)} /></label>
        {clientes && <span className="meta-chip tabular">{clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}</span>}
      </div>
      <Aviso erro={consulta.erro} aoTentarNovamente={consulta.erro ? consulta.recarregar : undefined} />
      {consulta.carregando && <SkeletonList quantidade={4} />}
      {!consulta.carregando && clientes?.length === 0 && <Vazio texto="Nenhum cliente encontrado." />}
      {Boolean(clientes?.length) && (
        <div className="admin-table-shell">
          <div className="admin-table-head" aria-hidden="true"><span>Cliente</span><span>Usuário</span><span>Status</span><span className="admin-table-head-actions">Ações</span></div>
          <div className="admin-table-body">
            {clientes?.map(c => (
              <div className="admin-table-row" key={c.id}>
                <div className="admin-row-primary">
                  <div className="avatar-sm" aria-hidden="true">{iniciais(c.nome)}</div>
                  <div className="list-copy"><h3>{c.nome}</h3><p className="text-secondary">{c.email}</p></div>
                </div>
                <div className="admin-row-metrics">
                  <div className="admin-metric-cell"><small className="admin-metric-label">Usuário</small><span className="text-secondary">@{c.username}</span></div>
                  <div className="admin-metric-cell"><small className="admin-metric-label">Status</small><span className={`status-pill ${c.ativo ? "status-pill--confirmado" : "status-pill--cancelado"}`}><i className="status-dot" aria-hidden="true" />{c.ativo ? "Ativo" : "Inativo"}</span></div>
                </div>
                <div className="admin-row-actions"><Link className="btn btn--neutro btn--compacto" to={`/clientes/${c.id}`}>Ver ficha</Link></div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export function ClientePage() {
  const { id } = useParams();
  const c = useConsulta<Usuario>(`/usuarios/${id}`);
  const cartao = useConsulta<Cartao>(`/fidelidade/${id}`);
  const agenda = useConsulta<Agendamento[]>(`/agendamentos/cliente/${id}`);
  const historicoOrdenado = agenda.dados?.toSorted(compararInicioDesc);

  return (
    <section className="stack">
      <Titulo eyebrow="Ficha do cliente" titulo={c.dados?.nome ?? "Cliente"} detalhe={c.dados?.email}
        acao={<Link className="btn btn--neutro btn--compacto" to="/clientes"><ArrowLeft size={15} strokeWidth={1.75} /> Clientes</Link>} />
      <Aviso erro={c.erro || cartao.erro || agenda.erro} aoTentarNovamente={c.erro ? c.recarregar : agenda.erro ? agenda.recarregar : cartao.erro ? cartao.recarregar : undefined} />
      {(c.carregando || cartao.carregando || agenda.carregando) && <SkeletonList quantidade={3} />}
      {historicoOrdenado && (
        <section className="surface-card stack-sm">
          <h2>Histórico de atendimentos</h2>
          {historicoOrdenado.length === 0 && <Vazio texto="Nenhum atendimento registrado." />}
          {historicoOrdenado.length > 0 && (
            <div className="list-panel">
              {historicoOrdenado.map(a => (
                <div className="list-row" key={a.id}>
                  <div className="list-copy"><strong>{a.servico}</strong><p className="text-secondary tabular">{dataHora(a.inicio)} · {a.barbeiro}</p></div>
                  <span className={`status-pill status-pill--${a.status.toLowerCase()}`}><i className="status-dot" aria-hidden="true" />{statusTexto[a.status]}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
      {cartao.dados && <CartaoFidelidade cartao={cartao.dados} cliente={false} />}
    </section>
  );
}
