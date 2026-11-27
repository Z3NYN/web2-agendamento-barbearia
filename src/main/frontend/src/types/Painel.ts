import type { Agendamento } from "./Barbearia";

export type PeriodoPainel = "HOJE" | "ESTA_SEMANA" | "ESTE_MES" | "MES_ANTERIOR" | "PERSONALIZADO";

export interface VariacaoMetrica {
  atual: number;
  anterior: number;
  deltaAbsoluto: number;
  deltaPercentual: number | null;
  comparavel: boolean;
  observacao: string | null;
}

export interface ContextoPeriodo {
  tipo: PeriodoPainel;
  inicio: string;
  fim: string;
  comparacaoInicio: string;
  comparacaoFim: string;
  corteAtualFim: string;
  rotuloPeriodo: string;
  rotuloComparacao: string;
  metodologiaComparacao: string;
  fusoHorario: string;
  barbeiroId: number | null;
  barbeiroNome: string | null;
  periodoIncompleto: boolean;
}

export interface AtencaoOperacional {
  aguardandoConfirmacao: number;
  prontosParaConcluir: number;
  proximosHoje: number;
  canceladosOuFaltasHoje: number;
  minutosLivresHoje: number;
  minutosDisponiveisHoje: number;
  agendaHoje: Agendamento[];
}

export interface IndicadoresPainel {
  totalAgendamentos: number;
  concluidos: number;
  concluidosPagos: number;
  concluidosBeneficio: number;
  pendentes: number;
  confirmados: number;
  cancelados: number;
  faltas: number;
  valorServicosConcluidos: number;
  valorPrevistoAgendamentos: number;
  ticketMedioConcluidos: number | null;
  taxaComparecimento: number | null;
  taxaCancelamento: number | null;
  clientesUnicosAtendidos: number;
  clientesRecorrentes: number;
  primeirosAtendimentos: number;
  novosCadastros: number;
  cadastrosSemDataHistorica: number;
  minutosOcupados: number;
  minutosDisponiveis: number;
  minutosBloqueados: number;
  ocupacaoPercentual: number | null;
  minutosOcupadosDecorridos: number;
  minutosDisponiveisDecorridos: number;
  ocupacaoDecorridaPercentual: number | null;
  ocupacaoEstimadaHistorica: boolean;
  compAgendamentos: VariacaoMetrica;
  compConcluidos: VariacaoMetrica;
  compValorConcluidos: VariacaoMetrica;
  compClientesUnicos: VariacaoMetrica;
}

export interface PontoSerie {
  rotulo: string;
  inicio: string;
  fim: string;
  total: number;
  concluidos: number;
  confirmados: number;
  pendentes: number;
  cancelados: number;
  faltas: number;
  valorConcluidos: number;
  valorPrevisto: number;
}

export interface ItemStatus {
  status: string;
  rotulo: string;
  quantidade: number;
  percentual: number;
}

export interface RankingServico {
  servicoId: number;
  nome: string;
  totalAgendamentos: number;
  concluidos: number;
  concluidosBeneficio: number;
  canceladosOuFaltas: number;
  valorConcluidos: number;
  valorPorHora: number | null;
  participacaoPercentual: number;
}

export interface DesempenhoProfissional {
  barbeiroId: number;
  nome: string;
  ativo: boolean;
  totalAgendamentos: number;
  concluidos: number;
  pendentesOuConfirmados: number;
  canceladosOuFaltas: number;
  minutosAgendados: number;
  minutosDisponiveis: number;
  ocupacaoPercentual: number | null;
  valorConcluidos: number;
  ticketMedio: number | null;
  observacaoDisponibilidade: string;
}

export interface CelulaDemanda {
  diaSemana: string;
  rotuloDia: string;
  horaInicio: number;
  horaFim: number;
  rotuloFaixa: string;
  atendimentos: number;
  minutosOcupados: number;
  minutosDisponiveis: number;
  ocupacaoPercentual: number | null;
  nivel: "FECHADO" | "DADOS_INSUFICIENTES" | "BAIXA" | "MEDIA" | "ALTA";
}

export interface ResumoFidelidadeClientes {
  programaAtivo: boolean;
  meta: number;
  nomePremio: string | null;
  clientesUnicosAtendidos: number;
  primeirosAtendimentos: number;
  clientesRecorrentes: number;
  novosCadastros: number;
  cadastrosSemDataHistorica: number;
  participantesFidelidade: number;
  clientesComRecompensaDisponivel: number;
  recompensasLiberadasNoPeriodo: number;
  recompensasResgatadasNoPeriodo: number;
  creditosEmitidosNoPeriodo: number;
}

export interface LimitacaoDado {
  codigo: string;
  titulo: string;
  detalhe: string;
}

export interface ProfissionalFiltro {
  id: number;
  nome: string;
  ativo: boolean;
}

export type SeveridadeInsight = "ALTA" | "ATENCAO" | "POSITIVO" | "INFORMATIVO";

export interface InsightNegocio {
  id: string;
  categoria: string;
  severidade: SeveridadeInsight;
  prioridade: number;
  titulo: string;
  oQueAconteceu: string;
  porQueImporta: string;
  oQueFazer: string;
  evidencia: string;
  amostra: string;
  acaoRotulo: string | null;
  acaoUrl: string | null;
  permissaoAcao: string | null;
}

export interface ResumoNarrativo {
  manchete: string;
  resultadosPrincipais: string[];
  comparacaoAnterior: string;
  destaquesPositivos: string[];
  pontosAtencao: string[];
  resumoMetas: string;
  prioridadesSugeridas: string[];
}

export interface ItemProgressoMeta {
  codigo: string;
  rotulo: string;
  unidade: "atend." | "BRL" | "clientes" | "cadastros" | "PCT";
  atual: number;
  meta: number;
  percentualAtingido: number;
  restante: number;
  mediaDiariaNecessaria: number | null;
  atingida: boolean;
  observacao: string;
}

export interface ResumoMetaMensal {
  ano: number;
  mes: number;
  rotuloMes: string;
  configurada: boolean;
  statusMes: "ENCERRADO" | "EM_ANDAMENTO" | "FUTURO";
  diasOperacionaisTotais: number;
  diasOperacionaisDecorridos: number;
  diasOperacionaisRestantes: number;
  atualizadaEm: string | null;
  itens: ItemProgressoMeta[];
}

export interface EntradaMeta {
  metaAtendimentosConcluidos?: number | null;
  metaValorConcluidos?: number | null;
  metaClientesUnicos?: number | null;
  metaNovosCadastros?: number | null;
  metaOcupacaoPercentual?: number | null;
}

export interface ResumoPainel {
  geradoEm: string;
  contexto: ContextoPeriodo;
  operacaoHoje: AtencaoOperacional;
  indicadores: IndicadoresPainel;
  serieTemporal: PontoSerie[];
  distribuicaoStatus: ItemStatus[];
  rankingServicos: RankingServico[];
  desempenhoProfissionais: DesempenhoProfissional[];
  mapaDemanda: CelulaDemanda[];
  fidelidadeClientes: ResumoFidelidadeClientes;
  limitacoes: LimitacaoDado[];
  insights: InsightNegocio[];
  resumoPeriodo: ResumoNarrativo;
  metaMes: ResumoMetaMensal;
}
