import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Aviso, SkeletonList, Titulo, Vazio } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import { dataHora, iniciais, statusTexto } from "../services/formato";
import { CartaoFidelidade } from "./FidelidadePage";
import type { Agendamento, Cartao } from "../types/Barbearia";
import type { Usuario } from "../types/Usuario";

export function ClientesPage() {
  const consulta = useConsulta<Usuario[]>("/usuarios");
  const [busca, setBusca] = useState("");
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const clientes = consulta.dados?.filter(
    u =>
      u.permissoes.some(p => p.nome === "CLIENTE") &&
      (!busca.trim() || norm(u.nome + " " + u.email + " " + u.username).includes(norm(busca.trim())))
  );

  return (
    <section className="stack">
      <Titulo eyebrow="Gestão" titulo="Clientes" detalhe="Consulte cadastro, histórico de atendimentos e cartão fidelidade." />
      <label className="search-pill">
        <Search size={17} />
        <input
          type="search"
          aria-label="Buscar clientes"
          placeholder="Buscar por nome, usuário ou e-mail"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
      </label>
      <Aviso erro={consulta.erro} />
      {consulta.carregando && <SkeletonList quantidade={4} />}
      {!consulta.carregando && clientes?.length === 0 && <Vazio texto="Nenhum cliente encontrado." />}
      {Boolean(clientes?.length) && (
        <div className="surface-card list-panel">
          {clientes?.map(c => (
            <div className="list-row" key={c.id}>
              <div className="avatar-sm" aria-hidden="true">{iniciais(c.nome)}</div>
              <div className="list-copy">
                <div className="inline-title">
                  <h3>{c.nome}</h3>
                  <span className={`status-pill ${c.ativo ? "status-pill--confirmado" : "status-pill--cancelado"}`}>
                    <i className="status-dot" aria-hidden="true" />
                    {c.ativo ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="text-secondary">{c.email} · @{c.username}</p>
              </div>
              <Link className="btn btn--neutro btn--compacto" to={`/clientes/${c.id}`}>Ver ficha</Link>
            </div>
          ))}
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

  return (
    <section className="stack">
      <Titulo
        eyebrow="Ficha do cliente"
        titulo={c.dados?.nome ?? "Cliente"}
        detalhe={c.dados?.email}
        acao={
          <Link className="btn btn--neutro btn--compacto" to="/clientes">
            <ArrowLeft size={15} /> Clientes
          </Link>
        }
      />
      <Aviso erro={c.erro || cartao.erro || agenda.erro} />
      {(c.carregando || cartao.carregando || agenda.carregando) && <SkeletonList quantidade={3} />}

      {agenda.dados && (
        <section className="surface-card stack-sm">
          <h2>Histórico de atendimentos</h2>
          {agenda.dados.length === 0 && <Vazio texto="Nenhum atendimento registrado." />}
          {agenda.dados.length > 0 && (
            <div className="list-panel">
              {agenda.dados.map(a => (
                <div className="list-row" key={a.id}>
                  <div className="list-copy">
                    <strong>{a.servico}</strong>
                    <p className="text-secondary tabular">{dataHora(a.inicio)} · {a.barbeiro}</p>
                  </div>
                  <span className={`status-pill status-pill--${a.status.toLowerCase()}`}>
                    <i className="status-dot" aria-hidden="true" />
                    {statusTexto[a.status]}
                  </span>
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
