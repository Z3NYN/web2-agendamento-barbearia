import { Link } from "react-router-dom";
import CadastroCrud from "../components/CadastroCrud";
import Botao from "../components/Botao";
import type { Usuario } from "../types/Usuario";
import api from "../services/api";
import { useState } from "react";
import { Aviso } from "../components/Interface";
import { mensagem } from "../services/formato";

function Reativar({ id, aoAtivar }: { id: number; aoAtivar: (msg: string) => void }) {
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  async function ativar() {
    setOcupado(true); setErro("");
    try { await api.put(`/usuarios/${id}/ativar`); aoAtivar("Conta reativada."); }
    catch (e) { setErro(mensagem(e)); }
    finally { setOcupado(false); }
  }
  return <><Aviso erro={erro} /><Botao disabled={ocupado} variante="neutro" onClick={() => void ativar()}>Reativar</Botao></>;
}

export default function UsuariosPage() {
  return <CadastroCrud<Usuario> titulo="Usuários" descricao="Gerencie contas de acesso. Novas contas começam com o perfil Cliente."
    url="/usuarios" nomeNovo="Novo usuário" remover="Desativar" podeRemover={u => u.ativo}
    campos={[{ chave: "nome", nome: "Nome", obrigatorio: true, tamanho: 100 },
      { chave: "username", nome: "Usuário", obrigatorio: true, tamanho: 40, minimo: 3 },
      { chave: "email", nome: "E-mail", tipo: "email", obrigatorio: true, tamanho: 150 },
      { chave: "senha", nome: "Senha (obrigatória no cadastro)", tipo: "password", tamanho: 72, minimo: 8 }]}
    padrao={{ nome: "", username: "", email: "", senha: "" }}
    editar={u => ({ nome: u.nome, username: u.username, email: u.email, senha: "" })} enviar={v => v}
    exibir={u => <><h3><Link to={`/usuarios/${u.id}`}>{u.nome}</Link> {!u.ativo && <span className="tag">Inativo</span>}</h3>
      <p className="muted">{u.username} · {u.permissoes.map(p => p.nome).join(", ")}</p></>}
    extras={(u, recarregar) => !u.ativo && <Reativar id={u.id} aoAtivar={recarregar} />} />;
}
