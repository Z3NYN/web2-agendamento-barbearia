export type StatusRetencao =
  | "RETORNO_ATRASADO"
  | "AGENDAMENTO_FUTURO"
  | "RETORNO_ESPERADO"
  | "CLIENTE_RECORRENTE"
  | "CLIENTE_NOVO"
  | "HISTORICO_INSUFICIENTE";

export type OrdenacaoRetencao =
  | "ATRASO"
  | "ULTIMO_ATENDIMENTO"
  | "VALOR"
  | "VISITAS"
  | "NOME";

export interface ContadoresRetencao {
  totalClientes: number;
  atrasados: number;
  agendamentoFuturo: number;
  retornoEsperado: number;
  recorrentes: number;
  novos: number;
  historicoInsuficiente: number;
}

export interface ClienteRetencao {
  id: number;
  nome: string;
  username: string;
  email: string;
  ativo: boolean;
  statusRetencao: StatusRetencao;
  rotuloStatus: string;
  explicacaoStatus: string;
  ultimoAtendimento: string | null;
  diasDesdeUltimo: number | null;
  totalConcluidos: number;
  intervaloHabitualDias: number | null;
  limiteEsperaDias: number | null;
  servicoMaisFrequente: string | null;
  profissionalMaisFrequente: string | null;
  valorTotalConcluidos: number;
  recompensasDisponiveis: number | null;
  proximoAgendamento: string | null;
}

export interface PainelRetencao {
  resumo: ContadoresRetencao;
  clientes: ClienteRetencao[];
}
