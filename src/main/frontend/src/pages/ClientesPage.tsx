import { Link, useParams } from "react-router-dom";
import { Aviso, Titulo, Vazio } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import { dataHora, statusTexto } from "../services/formato";
import { CartaoFidelidade } from "./FidelidadePage";
import type { Agendamento, Cartao } from "../types/Barbearia";
import type { Usuario } from "../types/Usuario";

export function ClientesPage() {
  const consulta = useConsulta<Usuario[]>("/usuarios");
  const clientes = consulta.dados?.filter(u => u.permissoes.some(p => p.nome === "CLIENTE"));
  return <><Titulo titulo="Clientes" detalhe="Consulte o cadastro, os atendimentos e a fidelidade." />
    <Aviso erro={consulta.erro} carregando={consulta.carregando} />
    {clientes?.length === 0 && <Vazio texto="Nenhum cliente cadastrado." />}
    {Boolean(clientes?.length) && <div className="panel">
      {clientes?.map(c => <div className="list-row" key={c.id}><div><h3>{c.nome} {!c.ativo && <span className="tag">Inativo</span>}</h3>
        <p className="muted">{c.email}</p></div><Link className="button button--neutro" to={`/clientes/${c.id}`}>Ver cliente</Link></div>)}
    </div>}</>;
}

export function ClientePage() {
  const { id } = useParams();
  const c = useConsulta<Usuario>(`/usuarios/${id}`);
  const cartao = useConsulta<Cartao>(`/fidelidade/${id}`);
  const agenda = useConsulta<Agendamento[]>(`/agendamentos/cliente/${id}`);
  return <><Titulo titulo={c.dados?.nome ?? "Cliente"} detalhe={c.dados?.email}
    acao={<Link className="button button--neutro" to="/clientes">Voltar aos clientes</Link>} />
    <div className="stack"><Aviso erro={c.erro || cartao.erro || agenda.erro} carregando={c.carregando || cartao.carregando || agenda.carregando} />
      {agenda.dados && <section className="panel stack"><h2>Histórico de atendimentos</h2>
        {agenda.dados.length === 0 && <Vazio texto="Nenhum atendimento registrado." />}
        {agenda.dados.map(a => <div className="list-row" key={a.id}><div><h3>{a.servico}</h3><p className="muted">{dataHora(a.inicio)} · {a.barbeiro}</p></div>
          <span className={`status status--${a.status.toLowerCase()}`}>{statusTexto[a.status]}</span></div>)}
      </section>}
      {cartao.dados && <CartaoFidelidade cartao={cartao.dados} cliente={false} />}
    </div></>;
}
