import { useState } from "react";
import FotosAdmin from "../components/FotosAdmin";
import CadastroCrud from "../components/CadastroCrud";
import type { DefCampo } from "../components/CadastroCrud";
import type { Barbeiro, Servico } from "../types/Barbearia";
import type { Usuario } from "../types/Usuario";
import { dataHora, moeda } from "../services/formato";
import { useConsulta } from "../services/useConsulta";

const basicos: DefCampo[] = [
  { chave: "nome", nome: "Nome", obrigatorio: true, tamanho: 100 },
  { chave: "descricao", nome: "Descrição", tamanho: 240 },
];

export function ServicosPage() {
  return <CadastroCrud<Servico> titulo="Serviços" descricao="Gerencie preços, durações e elegibilidade para fidelidade."
    nomeNovo="Novo serviço" url="/servicos" campos={[...basicos,
      { chave: "preco", nome: "Preço em reais", tipo: "number", obrigatorio: true, min: 0, max: 99999999, passo: "0.01" },
      { chave: "duracaoMinutos", nome: "Duração em minutos", tipo: "number", obrigatorio: true, min: 5, max: 480 },
      { chave: "elegivel", nome: "Gera crédito de fidelidade", tipo: "checkbox" },
      { chave: "ativo", nome: "Disponível para agendar", tipo: "checkbox" },
    ]} padrao={{ nome: "", descricao: "", preco: "", duracaoMinutos: "30", elegivel: true, ativo: true }}
    editar={s => ({ nome: s.nome, ativo: s.ativo, elegivel: s.elegivel, descricao: s.descricao ?? "", preco: String(s.preco), duracaoMinutos: String(s.duracaoMinutos) })}
    enviar={v => ({ ...v, preco: Number(v.preco), duracaoMinutos: Number(v.duracaoMinutos) })}
    exibir={s => <><h3>{s.nome} {!s.ativo && <span className="tag">Inativo</span>}</h3>
      <p className="muted">{moeda(s.preco)} · {s.duracaoMinutos} min{s.elegivel && " · Gera fidelidade"}</p>
      {s.descricao && <p>{s.descricao}</p>}</>}
    detalhes={s => <details className="catalog-photo"><summary>Foto do serviço</summary><FotosAdmin alvo="SERVICO" cadastroId={s.id} /></details>}
    remover="Desativar" podeRemover={s => s.ativo} />;
}

export function ProfissionaisPage() {
  const contas = useConsulta<Usuario[]>("/usuarios");
  const opcoes = contas.dados?.filter(u => u.ativo && u.permissoes.some(p => p.nome === "BARBEIRO"))
    .map(u => ({ valor: String(u.id), nome: `${u.nome} (${u.username})` })) ?? [];
  return <CadastroCrud<Barbeiro> titulo="Profissionais" descricao="Gerencie a equipe e vincule as contas de acesso à agenda."
    nomeNovo="Novo profissional" url="/barbeiros" campos={[...basicos.map(c => c.chave === "descricao" ? { ...c, nome: "Especialidade e apresentação" } : c),
      { chave: "usuarioId", nome: "Conta de acesso", tipo: "select", opcoes, opcaoVazia: "Sem conta vinculada" },
      { chave: "ativo", nome: "Disponível para agendar", tipo: "checkbox" },
    ]} padrao={{ nome: "", descricao: "", usuarioId: "", ativo: true }}
    editar={b => ({ nome: b.nome, descricao: b.descricao ?? "", usuarioId: b.usuarioId?.toString() ?? "", ativo: b.ativo })}
    enviar={v => ({ ...v, usuarioId: v.usuarioId ? Number(v.usuarioId) : null })}
    exibir={b => <><h3>{b.nome} {!b.ativo && <span className="tag">Inativo</span>}</h3>
      <p className="muted">{b.descricao || (b.usuarioId ? "Conta vinculada" : "Sem conta vinculada")}</p></>}
    detalhes={b => <details className="catalog-photo"><summary>Foto do profissional</summary><FotosAdmin alvo="BARBEIRO" cadastroId={b.id} /></details>}
    aviso={contas.erro} remover="Desativar" podeRemover={b => b.ativo} />;
}

const dias: Record<string, string> = {
  MONDAY: "Segunda-feira", TUESDAY: "Terça-feira", WEDNESDAY: "Quarta-feira", THURSDAY: "Quinta-feira",
  FRIDAY: "Sexta-feira", SATURDAY: "Sábado", SUNDAY: "Domingo",
};
interface Faixa { id: number; barbeiroId: number | null; inicio: string; fim: string; }
interface Expediente extends Faixa { dia: string; }
interface Bloqueio extends Faixa { motivo: string | null; }

export function ExpedientePage() {
  const [aba, setAba] = useState<"expediente" | "bloqueio">("expediente");
  const equipe = useConsulta<Barbeiro[]>("/barbeiros");
  const profissional: DefCampo = { chave: "barbeiroId", nome: "Aplicar a", tipo: "select",
    opcaoVazia: "Barbearia inteira", opcoes: equipe.dados?.map(b => ({ valor: String(b.id), nome: b.nome })) ?? [] };
  const nomeEquipe = (id: number | null) => id ? equipe.dados?.find(b => b.id === id)?.nome ?? "Profissional" : "Barbearia inteira";
  return <>
    <div className="tabs management-tabs" role="group" aria-label="Configuração de horários">
      <button aria-pressed={aba === "expediente"} onClick={() => setAba("expediente")}>Expediente semanal</button>
      <button aria-pressed={aba === "bloqueio"} onClick={() => setAba("bloqueio")}>Bloqueios pontuais</button>
    </div>
    {aba === "expediente" ? <CadastroCrud<Expediente> key="expediente" titulo="Expediente semanal"
      descricao="Um horário só abre quando o expediente da barbearia e do profissional coincidem."
      url="/expedientes" nomeNovo="Novo expediente" aviso={equipe.erro}
      campos={[profissional, { chave: "dia", nome: "Dia da semana", tipo: "select", obrigatorio: true,
        opcoes: Object.entries(dias).map(([valor, nome]) => ({ valor, nome })) },
        { chave: "inicio", nome: "Abertura", tipo: "time", obrigatorio: true },
        { chave: "fim", nome: "Encerramento", tipo: "time", obrigatorio: true }]}
      padrao={{ barbeiroId: "", dia: "MONDAY", inicio: "09:00", fim: "18:00" }}
      editar={e => ({ barbeiroId: e.barbeiroId?.toString() ?? "", dia: e.dia, inicio: e.inicio.slice(0, 5), fim: e.fim.slice(0, 5) })}
      enviar={v => ({ ...v, barbeiroId: v.barbeiroId ? Number(v.barbeiroId) : null })}
      exibir={e => <><h3>{dias[e.dia]} · {e.inicio.slice(0, 5)} – {e.fim.slice(0, 5)}</h3><p className="muted">{nomeEquipe(e.barbeiroId)}</p></>} />
      : <CadastroCrud<Bloqueio> key="bloqueio" titulo="Bloqueios pontuais" descricao="Feche horários para pausas, folgas ou feriados."
        url="/bloqueios" nomeNovo="Novo bloqueio" aviso={equipe.erro}
        campos={[profissional, { chave: "motivo", nome: "Motivo interno", tamanho: 180 },
          { chave: "inicio", nome: "Início", tipo: "datetime-local", obrigatorio: true },
          { chave: "fim", nome: "Fim", tipo: "datetime-local", obrigatorio: true }]}
        padrao={{ barbeiroId: "", motivo: "", inicio: "", fim: "" }}
        editar={e => ({ barbeiroId: e.barbeiroId?.toString() ?? "", motivo: e.motivo ?? "", inicio: e.inicio.slice(0, 16), fim: e.fim.slice(0, 16) })}
        enviar={v => ({ ...v, barbeiroId: v.barbeiroId ? Number(v.barbeiroId) : null })}
        exibir={e => <><h3>{nomeEquipe(e.barbeiroId)}{e.motivo ? ` · ${e.motivo}` : ""}</h3>
          <p className="muted">{dataHora(e.inicio)} → {dataHora(e.fim)}</p></>} />}
  </>;
}
