import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import api from "../services/api";
import { mensagem } from "../services/formato";
import { useConsulta } from "../services/useConsulta";
import { Aviso, Campo, SkeletonList, Titulo, Vazio } from "./Interface";
import Botao from "./Botao";

type Registro = { id: number };
type Valores = Record<string, string | boolean>;

export type DefCampo = {
  chave: string;
  nome: string;
  tipo?: "text" | "number" | "email" | "password" | "date" | "time" | "datetime-local" | "checkbox" | "select";
  obrigatorio?: boolean;
  min?: number;
  max?: number;
  passo?: string;
  opcoes?: { valor: string; nome: string }[];
  opcaoVazia?: string;
  somenteLeitura?: boolean;
  tamanho?: number;
  minimo?: number;
};

type Props<T extends Registro> = {
  titulo: string;
  descricao?: string;
  url: string;
  nomeNovo: string;
  campos: DefCampo[];
  padrao: Valores;
  editar: (item: T) => Valores;
  enviar: (valores: Valores) => unknown;
  exibir: (item: T) => ReactNode;
  midia?: (item: T) => ReactNode;
  remover?: string;
  podeRemover?: (item: T) => boolean;
  extras?: (item: T, atualizar: (msg: string) => void) => ReactNode;
  aviso?: string;
  detalhes?: (item: T) => ReactNode;
};

function FormCadastro({
  campos,
  padrao,
  itemId,
  onSalvar,
  onFechar,
  nomeNovo,
}: {
  campos: DefCampo[];
  padrao: Valores;
  itemId?: number;
  nomeNovo: string;
  onSalvar: (dados: Valores) => Promise<void>;
  onFechar: () => void;
}) {
  const [valores, setValores] = useState(padrao);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  function alterar(chave: string, valor: string | boolean) {
    setValores(v => ({ ...v, [chave]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setErro("");
    try {
      await onSalvar(valores);
    } catch (err) {
      setErro(mensagem(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form className="surface-card form-stack crud-form-drawer" onSubmit={enviar}>
      <h2 className="section-title">{itemId ? "Editar cadastro" : nomeNovo}</h2>
      <Aviso erro={erro} />
      <div className="form-grid-2">
        {campos.map(c =>
          c.tipo === "checkbox" ? (
            <label className="check-row" key={c.chave}>
              <input
                type="checkbox"
                checked={Boolean(valores[c.chave])}
                onChange={e => alterar(c.chave, e.target.checked)}
              />
              <span>{c.nome}</span>
            </label>
          ) : (
            <Campo key={c.chave} nome={c.nome}>
              {c.tipo === "select" ? (
                <select
                  value={String(valores[c.chave] ?? "")}
                  required={c.obrigatorio}
                  onChange={e => alterar(c.chave, e.target.value)}
                >
                  <option value="">{c.opcaoVazia ?? "Selecione"}</option>
                  {c.opcoes?.map(o => (
                    <option key={o.valor} value={o.valor}>{o.nome}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={c.tipo ?? "text"}
                  value={String(valores[c.chave] ?? "")}
                  onChange={e => alterar(c.chave, e.target.value)}
                  required={c.obrigatorio}
                  min={c.min}
                  max={c.max}
                  step={c.passo}
                  readOnly={c.somenteLeitura}
                  maxLength={c.tamanho}
                  minLength={c.minimo}
                  autoComplete={c.tipo === "password" ? "new-password" : undefined}
                />
              )}
            </Campo>
          )
        )}
      </div>
      <div className="inline-actions">
        <Botao type="submit" disabled={ocupado}>{ocupado ? "Salvando…" : "Salvar"}</Botao>
        <Botao variante="neutro" onClick={onFechar} disabled={ocupado}>Cancelar</Botao>
      </div>
    </form>
  );
}

export default function CadastroCrud<T extends Registro>(props: Props<T>) {
  const consulta = useConsulta<T[]>(props.url);
  const [busca, setBusca] = useState("");
  const normalizar = (texto: string) => texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const temBusca = consulta.dados?.some(item => "nome" in item);
  const lista = consulta.dados?.filter(
    item =>
      !busca.trim() ||
      Object.entries(item).some(
        ([chave, valor]) =>
          ["nome", "descricao", "username", "email"].includes(chave) &&
          typeof valor === "string" &&
          normalizar(valor).includes(normalizar(busca.trim()))
      )
  );

  const [item, setItem] = useState<T | null>();
  const [feedback, setFeedback] = useState<{ erro?: string; sucesso?: string }>({});
  const [removendo, setRemovendo] = useState<number>();

  function atualizar(msg: string) {
    consulta.recarregar();
    setFeedback({ sucesso: msg });
  }

  async function salvar(dados: Valores) {
    if (item) await api.put(`${props.url}/${item.id}`, props.enviar(dados));
    else await api.post(props.url, props.enviar(dados));
    setItem(undefined);
    atualizar("Cadastro salvo.");
  }

  async function excluir(registro: T) {
    if (!window.confirm(`${props.remover ?? "Excluir"} este cadastro?`)) return;
    setRemovendo(registro.id);
    try {
      await api.delete(`${props.url}/${registro.id}`);
      atualizar("Cadastro atualizado.");
    } catch (e) {
      setFeedback({ erro: mensagem(e) });
    } finally {
      setRemovendo(undefined);
    }
  }

  return (
    <section className="stack">
      <Titulo
        titulo={props.titulo}
        detalhe={props.descricao}
        acao={
          <Botao onClick={() => { setItem(null); setFeedback({}); }}>
            <Plus size={16} /> {props.nomeNovo}
          </Botao>
        }
      />
      <Aviso erro={props.aviso || consulta.erro} />
      <Aviso {...feedback} />

      {item !== undefined && (
        <FormCadastro
          key={item?.id ?? "novo"}
          campos={props.campos}
          padrao={item ? props.editar(item) : props.padrao}
          itemId={item?.id}
          onFechar={() => setItem(undefined)}
          nomeNovo={props.nomeNovo}
          onSalvar={salvar}
        />
      )}

      {temBusca && (
        <label className="search-pill">
          <Search size={17} />
          <input
            type="search"
            aria-label="Buscar cadastros"
            placeholder="Buscar cadastros"
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
        </label>
      )}

      {consulta.carregando && <SkeletonList quantidade={4} />}
      {Boolean(consulta.dados?.length) && lista?.length === 0 && <Vazio texto="Nenhum cadastro corresponde à busca." />}
      {consulta.dados?.length === 0 && <Vazio texto="Nenhum cadastro nesta lista." />}

      {Boolean(lista?.length) && (
        <div className="surface-card list-panel">
          {lista?.map(r => (
            <article key={r.id} className="list-row">
              {props.midia && <div className="crud-media">{props.midia(r)}</div>}
              <div className="list-copy">{props.exibir(r)}</div>
              <div className="inline-actions">
                {props.extras?.(r, atualizar)}
                <Botao
                  variante="neutro"
                  compacto
                  onClick={() => {
                    setItem(r);
                    setFeedback({});
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <Pencil size={14} /> Editar
                </Botao>
                {(!props.podeRemover || props.podeRemover(r)) && (
                  <Botao
                    variante="perigo"
                    compacto
                    disabled={removendo === r.id}
                    onClick={() => void excluir(r)}
                  >
                    <Trash2 size={14} /> {props.remover ?? "Excluir"}
                  </Botao>
                )}
              </div>
              {props.detalhes?.(r)}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
