import { Link, useParams } from "react-router-dom";
import { Aviso, Titulo } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import type { Usuario } from "../types/Usuario";

export default function UsuarioDetailPage() {
  const { id } = useParams();
  const u = useConsulta<Usuario>(`/usuarios/${id}`);
  return <><Titulo titulo={u.dados?.nome ?? "Usuário"} acao={<Link className="button button--neutro" to="/usuarios">Voltar aos usuários</Link>} />
    <Aviso erro={u.erro} carregando={u.carregando} />
    {u.dados && <section className="panel stack"><p>Usuário · {u.dados.username}</p><p>E-mail · {u.dados.email}</p>
      <p>Permissões · {u.dados.permissoes.map(p => p.nome).join(", ")}</p>
      <Link className="button button--neutro" to={`/atribuir-permissoes?usuario=${u.dados.id}`}>Gerenciar permissões</Link>
    </section>}</>;
}
