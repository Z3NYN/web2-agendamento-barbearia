import { useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../services/api";
import { mensagem } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import { Aviso, Campo, Titulo } from "../components/Interface";
import Botao from "../components/Botao";
import type { Usuario } from "../types/Usuario";
import type { Permissao } from "../types/Permissao";

function Selecao({ usuario, permissoes }: { usuario: Usuario; permissoes: Permissao[] }) {
  const [ids, setIds] = useState(usuario.permissoes.map(p => p.id));
  const [feedback, setFeedback] = useState<{ erro?: string; sucesso?: string }>({});
  const [ocupado, setOcupado] = useState(false);
  async function salvar(e: FormEvent) {
    e.preventDefault(); setOcupado(true);
    try { await api.put(`/usuarios/${usuario.id}/permissoes`, ids); setFeedback({ sucesso: "Permissões atualizadas." }); }
    catch (e) { setFeedback({ erro: mensagem(e) }); }
    finally { setOcupado(false); }
  }
  return <form className="panel form-stack" onSubmit={salvar}>
    <h2>Permissões de {usuario.nome}</h2><Aviso {...feedback} />
    {permissoes.map(p => <label className="check-field" key={p.id}>
      <input type="checkbox" checked={ids.includes(p.id)} onChange={e => setIds(lista =>
        e.target.checked ? [...lista, p.id] : lista.filter(id => id !== p.id))} /> {p.nome} · {p.descricao}
    </label>)}<Botao type="submit" disabled={!ids.length || ocupado}>Salvar permissões</Botao>
  </form>;
}

export default function UsuarioPermissoesPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get("usuario");
  const usuarios = useConsulta<Usuario[]>("/usuarios");
  const usuario = useConsulta<Usuario>(id ? `/usuarios/${id}/permissoes` : null);
  const permissoes = useConsulta<Permissao[]>("/permissoes");
  return <><Titulo titulo="Atribuir permissões" detalhe="Selecione a conta e os perfis de acesso." />
    <div className="stack">
      <Aviso erro={usuarios.erro || usuario.erro || permissoes.erro} carregando={usuarios.carregando || usuario.carregando || permissoes.carregando} />
      <section className="panel"><Campo nome="Usuário"><select value={id ?? ""} onChange={e => setParams(e.target.value ? { usuario: e.target.value } : {})}>
        <option value="">Selecione uma conta</option>
        {usuarios.dados?.map(u => <option value={u.id} key={u.id}>{u.nome} ({u.username})</option>)}
      </select></Campo></section>
      {usuario.dados && permissoes.dados && <Selecao key={id} usuario={usuario.dados} permissoes={permissoes.dados} />}
    </div></>;
}
