import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Aviso, Titulo } from "../components/Interface";
import { temPermissao } from "../services/auth";
import { useConsulta } from "../services/useConsulta";
import type { Usuario } from "../types/Usuario";

export default function UsuarioDetailPage() {
  const { id } = useParams();
  const u = useConsulta<Usuario>(`/usuarios/${id}`);
  const podeAtribuir = temPermissao("ACESSOS_ATRIBUIR");

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
          <div className="ticket-row">
            <span>Perfis e permissões atribuídos</span>
            <strong>{u.dados.permissoes.map(p => p.titulo || p.nome).join(", ")}</strong>
          </div>
          {Boolean(u.dados.permissoesEfetivas?.length) && (
            <div className="ticket-row">
              <span>Capacidades efetivas</span>
              <strong>{u.dados.permissoesEfetivas?.join(", ")}</strong>
            </div>
          )}
          {podeAtribuir && (
            <div>
              <Link className="btn btn--neutro btn--compacto" to={`/atribuir-permissoes?usuario=${u.dados.id}`}>
                Gerenciar permissões
              </Link>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
