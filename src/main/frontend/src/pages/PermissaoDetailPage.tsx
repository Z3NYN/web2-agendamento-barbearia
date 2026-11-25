import { Link, useParams } from "react-router-dom";
import { Aviso, Titulo } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import type { Permissao } from "../types/Permissao";

export default function PermissaoDetailPage() {
  const { id } = useParams();
  const p = useConsulta<Permissao>(`/permissoes/${id}`);
  return <><Titulo titulo={p.dados?.nome ?? "Permissão"}
    acao={<Link className="button button--neutro" to="/permissoes">Voltar às permissões</Link>} />
    <Aviso erro={p.erro} carregando={p.carregando} />{p.dados && <section className="panel">{p.dados.descricao}</section>}</>;
}
