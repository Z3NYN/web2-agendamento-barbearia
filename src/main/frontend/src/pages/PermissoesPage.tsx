import { Link } from "react-router-dom";
import CadastroCrud from "../components/CadastroCrud";
import type { Permissao } from "../types/Permissao";

export default function PermissoesPage() {
  return (
    <CadastroCrud<Permissao>
      titulo="Permissões"
      descricao="Consulte os perfis do sistema e gerencie permissões adicionais."
      url="/permissoes"
      nomeNovo="Nova permissão"
      podeRemover={p => !["ADMIN", "BARBEIRO", "CLIENTE"].includes(p.nome)}
      campos={[
        { chave: "nome", nome: "Identificador em maiúsculas", obrigatorio: true, tamanho: 30 },
        { chave: "descricao", nome: "Descrição", obrigatorio: true, tamanho: 220 },
      ]}
      padrao={{ nome: "", descricao: "" }}
      editar={p => ({ nome: p.nome, descricao: p.descricao })}
      enviar={v => ({ ...v, nome: String(v.nome).toUpperCase().trim() })}
      exibir={p => (
        <>
          <h3><Link to={`/permissoes/${p.id}`} className="row-link">{p.nome}</Link></h3>
          <p className="text-secondary">{p.descricao}</p>
        </>
      )}
    />
  );
}
