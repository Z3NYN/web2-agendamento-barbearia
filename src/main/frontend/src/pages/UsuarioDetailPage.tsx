import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Aviso, Titulo } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import type { Usuario } from "../types/Usuario";

export default function UsuarioDetailPage() {
  const { id } = useParams();
  const u = useConsulta<Usuario>(`/usuarios/${id}`);

  return (
    <section className="stack">
      <Titulo
        eyebrow="Usuário"
        titulo={u.dados?.nome ?? "Usuário"}
        acao={<Link className="btn btn--neutro btn--compacto" to="/usuarios"><ArrowLeft size={15} /> Usuários</Link>}
      />
      <Aviso erro={u.erro} carregando={u.carregando} />
      {u.dados && (
        <section className="surface-card stack-sm">
          <div className="ticket-row"><span>Usuário</span><strong>@{u.dados.username}</strong></div>
          <div className="ticket-row"><span>E-mail</span><strong>{u.dados.email}</strong></div>
          <div className="ticket-row"><span>Permissões</span><strong>{u.dados.permissoes.map(p => p.nome).join(", ")}</strong></div>
          <div>
            <Link className="btn btn--neutro btn--compacto" to={`/atribuir-permissoes?usuario=${u.dados.id}`}>
              Gerenciar permissões
            </Link>
          </div>
        </section>
      )}
    </section>
  );
}
