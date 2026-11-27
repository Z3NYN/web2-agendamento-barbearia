import { useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import Botao from "../components/Botao";
import { Aviso, Campo, SkeletonList, Titulo, Vazio } from "../components/Interface";
import api from "../services/api";
import { mensagem } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import type { Permissao } from "../types/Permissao";

const CATEGORIAS: Record<string, string> = {
  PERFIL: "Perfis padrão",
  OPERACAO: "Operação e agenda",
  CATALOGO: "Catálogo e disponibilidade",
  MARCA: "Marca e mídia",
  SISTEMA: "Administração e governança",
};

const ORDEM_CATEGORIAS = ["PERFIL", "OPERACAO", "CATALOGO", "MARCA", "SISTEMA"];

function FormEdicao({
  permissao, aoSalvar, aoCancelar,
}: {
  permissao: Permissao; aoSalvar: () => void; aoCancelar: () => void;
}) {
  const [titulo, setTitulo] = useState(permissao.titulo ?? permissao.nome);
  const [descricao, setDescricao] = useState(permissao.descricao);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro("");
    try {
      await api.put(`/permissoes/${permissao.id}`, {
        nome: permissao.nome,
        titulo: titulo.trim(),
        descricao: descricao.trim(),
      });
      aoSalvar();
    } catch (err) {
      setErro(mensagem(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form className="surface-card form-stack crud-form-drawer" onSubmit={enviar}>
      <div className="section-head">
        <h2 className="section-title">Editar exibição de permissão</h2>
        <span className="meta-chip">{permissao.nome}</span>
      </div>
      <p className="text-secondary">
        O identificador técnico <code>{permissao.nome}</code> é fixo para preservar a segurança da API.
        Você pode ajustar o título e a descrição exibidos na interface.
      </p>
      <Aviso erro={erro} />
      <div className="form-grid-2">
        <Campo nome="Nome amigável">
          <input value={titulo} onChange={e => setTitulo(e.target.value)} required maxLength={120} />
        </Campo>
        <Campo nome="Identificador técnico (imutável)">
          <input value={permissao.nome} readOnly />
        </Campo>
      </div>
      <Campo nome="O que esta permissão autoriza">
        <input value={descricao} onChange={e => setDescricao(e.target.value)} required maxLength={260} />
      </Campo>
      <div className="inline-actions">
        <Botao type="submit" disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar alterações"}</Botao>
        <Botao variante="neutro" onClick={aoCancelar} disabled={ocupado}>Cancelar</Botao>
      </div>
    </form>
  );
}

export default function PermissoesPage() {
  const consulta = useConsulta<Permissao[]>("/permissoes");
  const [editando, setEditando] = useState<Permissao>();
  const [sucesso, setSucesso] = useState("");

  const grupos = ORDEM_CATEGORIAS
    .map(cat => ({
      categoria: cat,
      rotulo: CATEGORIAS[cat] ?? cat,
      itens: (consulta.dados ?? []).filter(p => (p.categoria ?? (p.tipo === "PERFIL" ? "PERFIL" : "SISTEMA")) === cat),
    }))
    .filter(g => g.itens.length > 0);

  return (
    <section className="stack">
      <Titulo
        eyebrow="Sistema"
        titulo="Permissões"
        detalhe="Cada permissão abaixo controla rotas, menus, ações da interface e autorizações reais na API. Apenas capacidades reais do sistema estão disponíveis."
        acao={<Link className="btn btn--neutro btn--compacto" to="/atribuir-permissoes">Atribuir acessos</Link>}
      />

      <Aviso erro={consulta.erro} sucesso={sucesso} aoTentarNovamente={consulta.erro ? consulta.recarregar : undefined} />

      {editando && (
        <FormEdicao
          key={editando.id}
          permissao={editando}
          aoCancelar={() => setEditando(undefined)}
          aoSalvar={() => {
            setEditando(undefined);
            setSucesso("Título e descrição atualizados.");
            consulta.recarregar();
          }}
        />
      )}

      {consulta.carregando && <SkeletonList quantidade={4} />}
      {!consulta.carregando && consulta.dados?.length === 0 && <Vazio texto="Nenhuma permissão catalogada." />}

      {grupos.map(grupo => (
        <section className="surface-card stack-sm" key={grupo.categoria}>
          <div className="section-head">
            <div className="inline-title">
              <Shield size={16} strokeWidth={1.75} className="accent-icon" />
              <h2 className="section-title">{grupo.rotulo}</h2>
            </div>
            <span className="meta-chip tabular">{grupo.itens.length}</span>
          </div>
          <div className="list-panel">
            {grupo.itens.map(p => (
              <div className="list-row" key={p.id}>
                <div className="list-copy">
                  <div className="inline-title">
                    <strong><Link to={`/permissoes/${p.id}`} className="row-link">{p.titulo || p.nome}</Link></strong>
                    <span className="meta-chip">{p.nome}</span>
                  </div>
                  <p className="text-secondary">{p.descricao}</p>
                </div>
                <div className="inline-actions">
                  <Botao
                    variante="neutro"
                    compacto
                    onClick={() => {
                      setEditando(p);
                      setSucesso("");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    <Pencil size={14} strokeWidth={1.75} /> Editar texto
                  </Botao>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
