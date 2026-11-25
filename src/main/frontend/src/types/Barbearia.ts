export interface Marca {
  nome: string;
  descricao: string | null;
  endereco: string | null;
  telefone: string | null;
  corDestaque: string;
  corFundo: string;
  logo: string | null;
  demonstracao: boolean;
  fidelidadeAtiva: boolean;
  meta: number;
  premioId: number | null;
  nomePremio: string | null;
  antecedenciaMinutos: number;
  whatsapp: string | null;
  instagram: string | null;
}

export interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  preco: number;
  duracaoMinutos: number;
  elegivel: boolean;
  ativo: boolean;
}

export interface Barbeiro {
  id: number;
  nome: string;
  descricao: string | null;
  usuarioId: number | null;
  ativo: boolean;
}

export type Status = "RESERVADO" | "CONFIRMADO" | "CONCLUIDO" | "CANCELADO" | "FALTOU";

export interface Agendamento {
  id: number;
  clienteId: number;
  cliente: string;
  barbeiroId: number;
  barbeiro: string;
  servicoId: number;
  servico: string;
  preco: number;
  inicio: string;
  fim: string;
  status: Status;
  beneficio: boolean;
  podeAlterar: boolean;
}

export interface SlotHorario {
  horario: string;
  disponivel: boolean;
}

export interface Movimento {
  id: number;
  tipo: "CREDITO" | "RECOMPENSA";
  quantidade: number;
  premio: string | null;
  servicoId: number | null;
  criadoEm: string;
  resgatadoEm: string | null;
  agendamentoId: number | null;
}

export interface Cartao {
  ativo: boolean;
  progresso: number;
  meta: number;
  proximoPremio: string | null;
  historico: Movimento[];
}

export type AlvoFoto = "ABERTURA" | "CAPA" | "SERVICO" | "BARBEIRO" | "GALERIA";

export interface Foto {
  id: string;
  alvo: AlvoFoto;
  cadastroId: number | null;
  legenda: string | null;
  categoria: string | null;
  url: string;
}

export interface ExpedientePublico {
  id: number;
  dia: string;
  inicio: string;
  fim: string;
}
