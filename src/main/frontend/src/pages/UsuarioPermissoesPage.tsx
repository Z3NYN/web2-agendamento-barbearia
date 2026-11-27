import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ShieldCheck } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { mensagem } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import { Aviso, Campo, Titulo } from "../components/Interface";
import Botao from "../components/Botao";
import type { Usuario } from "../types/Usuario";
import type { Permissao } from "../types/Permissao";

const CATEGORIAS: Record<string, string> = {
  OPERACAO: "Operação e agenda",
  CATALOGO: "Catálogo e disponibilidade",
  MARCA: "Marca e mídia",
  SISTEMA: "Administração e governança",
};

function Selecao({
  usuario, permissoes, sucessoExterno, aoSalvar,
}: {
  usuario: Usuario; permissoes: Permissao[]; sucessoExterno?: string; aoSalvar: (msg: string) => void;
}) {
  const [ids, setIds] = useState(usuario.permissoes.map(p => p.id));
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const perfis = useMemo(() => permissoes.filter(p => p.tipo === "PERFIL" || ["ADMIN", "BARBEIRO", "CLIENTE"].includes(p.nome)), [permissoes]);
  const capacidades = useMemo(() => permissoes.filter(p => !perfis.some(pf => pf.id === p.id)), [permissoes, perfis]);

  const selecionadas = useMemo(() => permissoes.filter(p => ids.includes(p.id)), [permissoes, ids]);
  const possuiAdmin = selecionadas.some(p => p.nome === "ADMIN");
  const efetivas = useMemo(() => {
    const codigos = new Set<string>(selecionadas.map(p => p.nome));
    if (possuiAdmin) {
      capacidades.forEach(c => codigos.add(c.nome));
    }
    return permissoes.filter(p => codigos.has(p.nome));
  }, [permissoes, selecionadas, possuiAdmin, capacidades]);

  const gruposCapacidades = useMemo(
    () =>
      Object.entries(CATEGORIAS)
        .map(([cat, rotulo]) => ({
          cat,
          rotulo,
          itens: capacidades.filter(c => (c.categoria ?? "SISTEMA") === cat),
        }))
        .filter(g => g.itens.length > 0),
    [capacidades]
  );

  function alternar(idPermissao: number, marcado: boolean) {
    setErro("");
    setIds(lista => (marcado ? [...new Set([...lista, idPermissao])] : lista.filter(x => x !== idPermissao)));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro("");
    try {
      await api.put(`/usuarios/${usuario.id}/permissoes`, ids);
      aoSalvar("Permissões atualizadas com efeito imediato. Sessões anteriores desta conta foram encerradas.");
    } catch (err) {
      setErro(mensagem(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form className="surface-card form-stack" onSubmit={salvar}>
      <div className="section-head">
        <div>
          <h2 className="section-title">Acessos de {usuario.nome}</h2>
          <p className="text-secondary">@{usuario.username} · {usuario.ativo ? "Conta ativa" : "Conta inativa"}</p>
        </div>
        <span className="meta-chip tabular">{efetivas.length} efetivas</span>
      </div>
      <Aviso erro={erro} sucesso={erro ? undefined : sucessoExterno} />

      <div className="stack-sm">
        <h3 className="section-title">Perfis padrão</h3>
        <div className="stack-xs">
          {perfis.map(p => (
            <label className="check-row" key={p.id}>
              <input
                type="checkbox"
                checked={ids.includes(p.id)}
                onChange={e => alternar(p.id, e.target.checked)}
              />
              <span>
                <strong>{p.titulo || p.nome}</strong> <code>({p.nome})</code> — {p.descricao}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="stack-sm">
        <h3 className="section-title">Permissões operacionais adicionais</h3>
        {possuiAdmin && (
          <p className="text-secondary">
            O perfil <strong>ADMIN</strong> já concede todas as permissões operacionais abaixo. Desmarque ADMIN se desejar conceder apenas permissões específicas.
          </p>
        )}
        {gruposCapacidades.map(grupo => (
          <div className="stack-xs" key={grupo.cat}>
            <strong className="eyebrow">{grupo.rotulo}</strong>
            {grupo.itens.map(p => (
              <label className="check-row" key={p.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(p.id)}
                  onChange={e => alternar(p.id, e.target.checked)}
                />
                <span>
                  <strong>{p.titulo || p.nome}</strong> <code>({p.nome})</code> — {p.descricao}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>

      <div className="surface-card stack-xs">
        <div className="inline-title">
          <ShieldCheck size={16} strokeWidth={1.75} className="accent-icon" />
          <strong>Acesso efetivo após salvar</strong>
        </div>
        {efetivas.length === 0 ? (
          <p className="text-secondary">Selecione ao menos um perfil ou permissão.</p>
        ) : (
          <div className="inline-actions">
            {efetivas.map(p => (
              <span className="meta-chip" key={p.id} title={p.descricao}>
                {p.titulo || p.nome}
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <Botao type="submit" disabled={!ids.length || ocupado}>
          {ocupado ? "Salvando…" : "Salvar permissões"}
        </Botao>
      </div>
    </form>
  );
}

export default function UsuarioPermissoesPage() {
  const [params, setParams] = useSearchParams();
  const [sucesso, setSucesso] = useState("");
  const id = params.get("usuario");
  const usuarios = useConsulta<Usuario[]>("/usuarios");
  const usuario = useConsulta<Usuario>(id ? `/usuarios/${id}/permissoes` : null);
  const permissoes = useConsulta<Permissao[]>("/permissoes");

  return (
    <section className="stack">
      <Titulo
        eyebrow="Acessos"
        titulo="Atribuir permissões"
        detalhe="Combine perfis padrão e permissões operacionais reais. Alterações revogam sessões ativas imediatamente."
      />
      <Aviso
        erro={usuarios.erro || usuario.erro || permissoes.erro}
        carregando={usuarios.carregando || usuario.carregando || permissoes.carregando}
      />
      <section className="surface-card">
        <Campo nome="Usuário">
          <select
            value={id ?? ""}
            onChange={e => {
              setSucesso("");
              setParams(e.target.value ? { usuario: e.target.value } : {});
            }}
          >
            <option value="">Selecione uma conta</option>
            {usuarios.dados?.map(u => (
              <option value={u.id} key={u.id}>
                {u.nome} (@{u.username}) — {u.permissoes.map(p => p.nome).join(", ")}
              </option>
            ))}
          </select>
        </Campo>
      </section>
      {usuario.dados && permissoes.dados && (
        <Selecao
          key={`${id}-${usuario.dados.permissoes.map(p => p.id).join("-")}`}
          usuario={usuario.dados}
          permissoes={permissoes.dados}
          sucessoExterno={sucesso}
          aoSalvar={msg => {
            setSucesso(msg);
            usuario.recarregar();
            usuarios.recarregar();
          }}
        />
      )}
    </section>
  );
}
