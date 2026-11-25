import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Aviso, Titulo } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import type { Permissao } from "../types/Permissao";

export default function PermissaoDetailPage() {
  const { id } = useParams();
  const p = useConsulta<Permissao>(`/permissoes/${id}`);
  return (
    <section className="stack">
      <Titulo
        eyebrow="Permissão"
        titulo={p.dados?.nome ?? "Permissão"}
        acao={<Link className="btn btn--neutro btn--compacto" to="/permissoes"><ArrowLeft size={15} /> Permissões</Link>}
      />
      <Aviso erro={p.erro} carregando={p.carregando} />
      {p.dados && <section className="surface-card">{p.dados.descricao}</section>}
    </section>
  );
}
