import { ArrowLeft, Shield } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Aviso, Titulo } from "../components/Interface";
import { useConsulta } from "../services/useConsulta";
import type { Permissao } from "../types/Permissao";

const ESCOPO_PERFIL: Record<string, string> = {
  ADMIN: "Concede todas as 13 permissões operacionais e de governança automaticamente, incluindo gestão de usuários, permissões e marca.",
  BARBEIRO: "Autoriza acompanhar e atualizar os próprios atendimentos quando vinculado a um profissional ativo. Permissões adicionais podem ser atribuídas separadamente.",
  CLIENTE: "Autoriza agendar serviços, acompanhar e reagendar as próprias reservas e consultar o próprio cartão fidelidade.",
};

export default function PermissaoDetailPage() {
  const { id } = useParams();
  const p = useConsulta<Permissao>(`/permissoes/${id}`);
  const ehPerfil = p.dados?.tipo === "PERFIL" || ["ADMIN", "BARBEIRO", "CLIENTE"].includes(p.dados?.nome ?? "");

  return (
    <section className="stack">
      <Titulo
        eyebrow={ehPerfil ? "Perfil do sistema" : "Permissão operacional"}
        titulo={p.dados?.titulo || p.dados?.nome || "Permissão"}
        acao={<Link className="btn btn--neutro btn--compacto" to="/permissoes"><ArrowLeft size={15} /> Permissões</Link>}
      />
      <Aviso erro={p.erro} carregando={p.carregando} />
      {p.dados && (
        <section className="surface-card stack-sm">
          <div className="ticket-row"><span>Identificador técnico</span><code>{p.dados.nome}</code></div>
          <div className="ticket-row"><span>Tipo</span><strong>{ehPerfil ? "Perfil padrão" : "Capacidade operacional"}</strong></div>
          {p.dados.categoria && <div className="ticket-row"><span>Categoria</span><strong>{p.dados.categoria}</strong></div>}
          <div className="stack-xs">
            <div className="inline-title">
              <Shield size={15} strokeWidth={1.75} className="accent-icon" />
              <strong>O que autoriza</strong>
            </div>
            <p className="text-secondary">{p.dados.descricao}</p>
            {ehPerfil && ESCOPO_PERFIL[p.dados.nome] && (
              <p className="text-secondary">{ESCOPO_PERFIL[p.dados.nome]}</p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
