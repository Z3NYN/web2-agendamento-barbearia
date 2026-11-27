import { useState } from "react";
import { Camera } from "lucide-react";
import FotosAdmin from "../components/FotosAdmin";
import CadastroCrud from "../components/CadastroCrud";
import type { DefCampo } from "../components/CadastroCrud";
import { FotoEditorial } from "../components/Experiencia";
import { useFotos } from "../components/FotosPublicas";
import { useMarca } from "../components/useMarca";
import type { Barbeiro, Servico } from "../types/Barbearia";
import type { Usuario } from "../types/Usuario";
import { dataHora, moeda } from "../services/formato";
import { temPermissao } from "../services/auth";
import { fotoProfissional, fotoServico } from "../services/fotosDemo";
import { useConsulta } from "../services/useConsulta";

const basicos: DefCampo[] = [
  { chave: "nome", nome: "Nome", obrigatorio: true, tamanho: 100 },
  { chave: "descricao", nome: "Descrição", tamanho: 240 },
];

export function ServicosPage() {
  const { marca } = useMarca();
  const fotos = useFotos();
  const podeGaleria = temPermissao("GALERIA_GERENCIAR");

  return (
    <CadastroCrud<Servico>
      eyebrow="Barbearia"
      titulo="Serviços"
      descricao="Gerencie preços, durações, elegibilidade para fidelidade e fotografias."
      nomeNovo="Novo serviço"
      url="/servicos"
      campos={[
        ...basicos,
        { chave: "preco", nome: "Preço em reais", tipo: "number", obrigatorio: true, min: 0, max: 99999999, passo: "0.01" },
        { chave: "duracaoMinutos", nome: "Duração em minutos", tipo: "number", obrigatorio: true, min: 5, max: 480 },
        { chave: "elegivel", nome: "Gera crédito de fidelidade", tipo: "checkbox" },
        { chave: "ativo", nome: "Disponível para agendar", tipo: "checkbox" },
      ]}
      padrao={{ nome: "", descricao: "", preco: "", duracaoMinutos: "30", elegivel: true, ativo: true }}
      editar={s => ({
        nome: s.nome,
        ativo: s.ativo,
        elegivel: s.elegivel,
        descricao: s.descricao ?? "",
        preco: String(s.preco),
        duracaoMinutos: String(s.duracaoMinutos),
      })}
      enviar={v => ({ ...v, preco: Number(v.preco), duracaoMinutos: Number(v.duracaoMinutos) })}
      midia={s => (
        <FotoEditorial
          src={fotoServico(fotos.dados, s, marca?.demonstracao)}
          alt={s.nome}
          className="crud-thumb"
        />
      )}
      exibir={s => (
        <>
          <h3>{s.nome}</h3>
          {s.descricao && <p className="text-secondary">{s.descricao}</p>}
        </>
      )}
      colunas={[
        { rotulo: "Duração", render: s => <span className="tabular">{s.duracaoMinutos} min</span> },
        { rotulo: "Preço", render: s => <strong className="tabular">{moeda(s.preco)}</strong> },
        {
          rotulo: "Status",
          render: s => (
            <span className={`status-pill ${s.ativo ? "status-pill--confirmado" : "status-pill--cancelado"}`}>
              <i className="status-dot" aria-hidden="true" />
              {s.ativo ? "Ativo" : "Inativo"}
            </span>
          ),
        },
      ]}
      detalhes={podeGaleria ? s => (
        <details className="catalog-photo">
          <summary><Camera size={14} strokeWidth={1.75} /> Foto do serviço</summary>
          <FotosAdmin alvo="SERVICO" cadastroId={s.id} alterou={fotos.recarregar} />
        </details>
      ) : undefined}
      remover="Desativar"
      podeRemover={s => s.ativo}
    />
  );
}

export function ProfissionaisPage() {
  const { marca } = useMarca();
  const fotos = useFotos();
  const podeGaleria = temPermissao("GALERIA_GERENCIAR");
  const contas = useConsulta<Usuario[]>("/usuarios/barbeiros");
  const opcoes =
    contas.dados
      ?.filter(u => u.ativo)
      .map(u => ({ valor: String(u.id), nome: `${u.nome} (${u.username})` })) ?? [];

  return (
    <CadastroCrud<Barbeiro>
      eyebrow="Barbearia"
      titulo="Profissionais"
      descricao="Gerencie a equipe, especialidades, retratos e contas vinculadas."
      nomeNovo="Novo profissional"
      url="/barbeiros"
      campos={[
        ...basicos.map(c => (c.chave === "descricao" ? { ...c, nome: "Especialidade e apresentação" } : c)),
        { chave: "usuarioId", nome: "Conta de acesso", tipo: "select", opcoes, opcaoVazia: "Sem conta vinculada" },
        { chave: "ativo", nome: "Disponível para agendar", tipo: "checkbox" },
      ]}
      padrao={{ nome: "", descricao: "", usuarioId: "", ativo: true }}
      editar={b => ({ nome: b.nome, descricao: b.descricao ?? "", usuarioId: b.usuarioId?.toString() ?? "", ativo: b.ativo })}
      enviar={v => ({ ...v, usuarioId: v.usuarioId ? Number(v.usuarioId) : null })}
      midia={b => (
        <FotoEditorial
          src={fotoProfissional(fotos.dados, b, marca?.demonstracao)}
          alt={b.nome}
          className="crud-thumb crud-thumb--portrait"
        />
      )}
      exibir={b => (
        <>
          <h3>{b.nome}</h3>
          <p className="text-secondary">{b.descricao || "Sem especialidades cadastradas"}</p>
        </>
      )}
      colunas={[
        {
          rotulo: "Acesso",
          render: b => <span className="text-secondary">{b.usuarioId ? "Conta vinculada" : "Sem conta"}</span>,
        },
        {
          rotulo: "Status",
          render: b => (
            <span className={`status-pill ${b.ativo ? "status-pill--confirmado" : "status-pill--cancelado"}`}>
              <i className="status-dot" aria-hidden="true" />
              {b.ativo ? "Ativo" : "Inativo"}
            </span>
          ),
        },
      ]}
      detalhes={podeGaleria ? b => (
        <details className="catalog-photo">
          <summary><Camera size={14} strokeWidth={1.75} /> Foto do profissional</summary>
          <FotosAdmin alvo="BARBEIRO" cadastroId={b.id} alterou={fotos.recarregar} />
        </details>
      ) : undefined}
      aviso={contas.erro}
      remover="Desativar"
      podeRemover={b => b.ativo}
    />
  );
}

const dias: Record<string, string> = {
  MONDAY: "Segunda-feira",
  TUESDAY: "Terça-feira",
  WEDNESDAY: "Quarta-feira",
  THURSDAY: "Quinta-feira",
  FRIDAY: "Sexta-feira",
  SATURDAY: "Sábado",
  SUNDAY: "Domingo",
};

interface Faixa {
  id: number;
  barbeiroId: number | null;
  inicio: string;
  fim: string;
}
interface Expediente extends Faixa {
  dia: string;
}
interface Bloqueio extends Faixa {
  motivo: string | null;
}

export function ExpedientePage() {
  const [aba, setAba] = useState<"expediente" | "bloqueio">("expediente");
  const equipe = useConsulta<Barbeiro[]>("/barbeiros");
  const profissional: DefCampo = {
    chave: "barbeiroId",
    nome: "Aplicar a",
    tipo: "select",
    opcaoVazia: "Barbearia inteira",
    opcoes: equipe.dados?.map(b => ({ valor: String(b.id), nome: b.nome })) ?? [],
  };
  const nomeEquipe = (id: number | null) =>
    id ? equipe.dados?.find(b => b.id === id)?.nome ?? "Profissional" : "Barbearia inteira";

  return (
    <div className="stack">
      <div className="segmented" role="group" aria-label="Configuração de horários">
        <button type="button" aria-pressed={aba === "expediente"} onClick={() => setAba("expediente")}>
          Expediente semanal
        </button>
        <button type="button" aria-pressed={aba === "bloqueio"} onClick={() => setAba("bloqueio")}>
          Bloqueios pontuais
        </button>
      </div>

      {aba === "expediente" ? (
        <CadastroCrud<Expediente>
          key="expediente"
          eyebrow="Barbearia"
          titulo="Expediente semanal"
          descricao="Um horário só abre quando o expediente da barbearia e do profissional coincidem."
          url="/expedientes"
          nomeNovo="Novo expediente"
          aviso={equipe.erro}
          campos={[
            profissional,
            {
              chave: "dia",
              nome: "Dia da semana",
              tipo: "select",
              obrigatorio: true,
              opcoes: Object.entries(dias).map(([valor, nome]) => ({ valor, nome })),
            },
            { chave: "inicio", nome: "Abertura", tipo: "time", obrigatorio: true },
            { chave: "fim", nome: "Encerramento", tipo: "time", obrigatorio: true },
          ]}
          padrao={{ barbeiroId: "", dia: "MONDAY", inicio: "09:00", fim: "18:00" }}
          editar={e => ({
            barbeiroId: e.barbeiroId?.toString() ?? "",
            dia: e.dia,
            inicio: e.inicio.slice(0, 5),
            fim: e.fim.slice(0, 5),
          })}
          enviar={v => ({ ...v, barbeiroId: v.barbeiroId ? Number(v.barbeiroId) : null })}
          exibir={e => <h3 className="tabular">{dias[e.dia]}</h3>}
          colunas={[
            { rotulo: "Faixa", render: e => <strong className="tabular">{e.inicio.slice(0, 5)} – {e.fim.slice(0, 5)}</strong> },
            { rotulo: "Escopo", render: e => <span className="text-secondary">{nomeEquipe(e.barbeiroId)}</span> },
          ]}
        />
      ) : (
        <CadastroCrud<Bloqueio>
          key="bloqueio"
          eyebrow="Barbearia"
          titulo="Bloqueios pontuais"
          descricao="Feche horários para pausas, folgas ou feriados."
          url="/bloqueios"
          nomeNovo="Novo bloqueio"
          aviso={equipe.erro}
          campos={[
            profissional,
            { chave: "motivo", nome: "Motivo interno", tamanho: 180 },
            { chave: "inicio", nome: "Início", tipo: "datetime-local", obrigatorio: true },
            { chave: "fim", nome: "Fim", tipo: "datetime-local", obrigatorio: true },
          ]}
          padrao={{ barbeiroId: "", motivo: "", inicio: "", fim: "" }}
          editar={e => ({
            barbeiroId: e.barbeiroId?.toString() ?? "",
            motivo: e.motivo ?? "",
            inicio: e.inicio.slice(0, 16),
            fim: e.fim.slice(0, 16),
          })}
          enviar={v => ({ ...v, barbeiroId: v.barbeiroId ? Number(v.barbeiroId) : null })}
          exibir={e => (
            <>
              <h3>{nomeEquipe(e.barbeiroId)}</h3>
              {e.motivo && <p className="text-secondary">{e.motivo}</p>}
            </>
          )}
          colunas={[
            { rotulo: "Período", render: e => <span className="tabular text-secondary">{dataHora(e.inicio)} → {dataHora(e.fim)}</span> },
          ]}
        />
      )}
    </div>
  );
}
