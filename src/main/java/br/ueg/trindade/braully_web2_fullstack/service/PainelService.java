package br.ueg.trindade.braully_web2_fullstack.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade.Tipo;
import br.ueg.trindade.braully_web2_fullstack.repository.*;
import br.ueg.trindade.braully_web2_fullstack.service.InsightsNegocioService.*;
import br.ueg.trindade.braully_web2_fullstack.service.MetaService.ResumoMetaMensal;
import br.ueg.trindade.braully_web2_fullstack.service.RetencaoClienteService.ContadoresRetencao;

@Service
@Transactional(readOnly = true)
public class PainelService {

    private static final String FUSO_NEGOCIO = "America/Sao_Paulo";
    private static final DateTimeFormatter DIA_FMT = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter DATA_BR_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter MES_ANO_FMT = DateTimeFormatter.ofPattern("MMM/yyyy", Locale.forLanguageTag("pt-BR"));
    private static final BigDecimal CEM = new BigDecimal("100");
    private static final BigDecimal SESSENTA = new BigDecimal("60");

    private final AgendamentoRepository agenda;
    private final BarbeiroRepository barbeiros;
    private final ExpedienteRepository expedientes;
    private final BloqueioRepository bloqueios;
    private final UsuarioRepository usuarios;
    private final MovimentoFidelidadeRepository movimentos;
    private final InstalacaoService instalacao;
    private final RetencaoClienteService retencao;
    private final MetaService metas;
    private final InsightsNegocioService insights;

    public PainelService(AgendamentoRepository agenda, BarbeiroRepository barbeiros,
                         ExpedienteRepository expedientes, BloqueioRepository bloqueios,
                         UsuarioRepository usuarios, MovimentoFidelidadeRepository movimentos,
                         InstalacaoService instalacao, RetencaoClienteService retencao,
                         MetaService metas, InsightsNegocioService insights) {
        this.agenda = agenda;
        this.barbeiros = barbeiros;
        this.expedientes = expedientes;
        this.bloqueios = bloqueios;
        this.usuarios = usuarios;
        this.movimentos = movimentos;
        this.instalacao = instalacao;
        this.retencao = retencao;
        this.metas = metas;
        this.insights = insights;
    }

    public enum Periodo { HOJE, ESTA_SEMANA, ESTE_MES, MES_ANTERIOR, PERSONALIZADO }

    public record Janela(LocalDate inicio, LocalDate fim, LocalDate corteAtualFim,
                         LocalDate comparacaoInicio, LocalDate comparacaoFim,
                         String rotuloPeriodo, String rotuloComparacao, String metodologia, boolean incompleto) {}

    public record Variacao(BigDecimal atual, BigDecimal anterior, BigDecimal deltaAbsoluto,
                           BigDecimal deltaPercentual, boolean comparavel, String observacao) {}

    public record ContextoPeriodo(Periodo tipo, LocalDate inicio, LocalDate fim, LocalDate comparacaoInicio,
                                  LocalDate comparacaoFim, LocalDate corteAtualFim, String rotuloPeriodo,
                                  String rotuloComparacao, String metodologiaComparacao, String fusoHorario,
                                  Long barbeiroId, String barbeiroNome, boolean periodoIncompleto) {}

    public record AtencaoOperacional(long aguardandoConfirmacao, long prontosParaConcluir, long proximosHoje,
                                     long canceladosOuFaltasHoje, long minutosLivresHoje, long minutosDisponiveisHoje,
                                     List<AgendaService.View> agendaHoje) {}

    public record Indicadores(long totalAgendamentos, long concluidos, long concluidosPagos, long concluidosBeneficio,
                              long pendentes, long confirmados, long cancelados, long faltas,
                              BigDecimal valorServicosConcluidos, BigDecimal valorPrevistoAgendamentos,
                              BigDecimal ticketMedioConcluidos, BigDecimal taxaComparecimento,
                              BigDecimal taxaCancelamento, long clientesUnicosAtendidos, long clientesRecorrentes,
                              long primeirosAtendimentos, long novosCadastros, long cadastrosSemDataHistorica,
                              long minutosOcupados, long minutosDisponiveis, long minutosBloqueados,
                              BigDecimal ocupacaoPercentual, boolean ocupacaoEstimadaHistorica,
                              long minutosOcupadosDecorridos, long minutosDisponiveisDecorridos,
                              BigDecimal ocupacaoDecorridaPercentual,
                              Variacao compAgendamentos, Variacao compConcluidos,
                              Variacao compValorConcluidos, Variacao compClientesUnicos) {}

    public record PontoSerie(String rotulo, LocalDate inicio, LocalDate fim, long total, long concluidos,
                             long confirmados, long pendentes, long cancelados, long faltas,
                             BigDecimal valorConcluidos, BigDecimal valorPrevisto) {}

    public record ItemStatus(String status, String rotulo, long quantidade, BigDecimal percentual) {}

    public record RankingServico(Long servicoId, String nome, long totalAgendamentos, long concluidos,
                                 long concluidosBeneficio, long canceladosOuFaltas, BigDecimal valorConcluidos,
                                 BigDecimal participacaoPercentual, BigDecimal valorPorHora) {}

    public record DesempenhoProfissional(Long barbeiroId, String nome, boolean ativo, long totalAgendamentos,
                                         long concluidos, long pendentesOuConfirmados, long canceladosOuFaltas,
                                         long minutosAgendados, long minutosDisponiveis, BigDecimal ocupacaoPercentual,
                                         BigDecimal valorConcluidos, BigDecimal ticketMedio,
                                         String observacaoDisponibilidade) {}

    public record CelulaDemanda(DayOfWeek diaSemana, String rotuloDia, int horaInicio, int horaFim, String rotuloFaixa,
                                long atendimentos, long minutosOcupados, long minutosDisponiveis,
                                BigDecimal ocupacaoPercentual, String nivel) {}

    public record ResumoFidelidadeClientes(boolean programaAtivo, int meta, String nomePremio,
                                           long clientesUnicosAtendidos, long primeirosAtendimentos,
                                           long clientesRecorrentes, long novosCadastros,
                                           long cadastrosSemDataHistorica, long participantesFidelidade,
                                           long clientesComRecompensaDisponivel, long recompensasLiberadasNoPeriodo,
                                           long recompensasResgatadasNoPeriodo, long creditosEmitidosNoPeriodo) {}

    public record LimitacaoDado(String codigo, String titulo, String detalhe) {}

    public record ProfissionalFiltro(Long id, String nome, boolean ativo) {}

    public record ResumoPainel(LocalDateTime geradoEm, ContextoPeriodo contexto, AtencaoOperacional operacaoHoje,
                               Indicadores indicadores, List<PontoSerie> serieTemporal,
                               List<ItemStatus> distribuicaoStatus, List<RankingServico> rankingServicos,
                               List<DesempenhoProfissional> desempenhoProfissionais, List<CelulaDemanda> mapaDemanda,
                               ResumoFidelidadeClientes fidelidadeClientes, List<LimitacaoDado> limitacoes,
                               List<InsightNegocio> insights, ResumoNarrativo resumoPeriodo,
                               ResumoMetaMensal metaMes) {}

    public record Faixa(LocalDateTime inicio, LocalDateTime fim) {
        public long minutos() {
            return Math.max(0L, Duration.between(inicio, fim).toMinutes());
        }
    }

    public record CapacidadePeriodo(long minutosDisponiveis, long minutosBloqueados,
                                    Map<Long, Long> disponivelPorBarbeiro, Map<Long, Long> bloqueadoPorBarbeiro) {}

    public record CalendarioMes(int diasTotais, int diasDecorridos, int diasRestantes) {}

    public List<ProfissionalFiltro> listarProfissionaisFiltro() {
        return barbeiros.findAllByOrderByNomeAsc().stream()
                .map(b -> new ProfissionalFiltro(b.getId(), b.getNome(), b.ativo))
                .toList();
    }

    public ResumoPainel resumo(Periodo periodo, LocalDate inicioParam, LocalDate fimParam, Long barbeiroId) {
        LocalDateTime agora = Regra.agora();
        LocalDate hoje = agora.toLocalDate();
        Barbeiro filtroBarbeiro = barbeiroId == null ? null : barbeiros.findById(barbeiroId).orElseThrow(Regra::inexistente);

        Janela janela = resolverJanela(periodo == null ? Periodo.ESTE_MES : periodo, inicioParam, fimParam, hoje);
        Barbearia loja = instalacao.atual();
        List<Barbeiro> todosBarbeiros = barbeiros.findAllByOrderByNomeAsc();
        List<Expediente> todosExpedientes = expedientes.findAllComBarbeiro();

        List<Agendamento> listaPeriodo = agenda.findDetalhadosNoPeriodo(
                        janela.inicio().atStartOfDay(), janela.fim().plusDays(1).atStartOfDay())
                .stream()
                .filter(a -> filtroBarbeiro == null || a.barbeiro.getId().equals(filtroBarbeiro.getId()))
                .toList();

        List<Agendamento> listaCorteAtual = janela.incompleto()
                ? listaPeriodo.stream()
                        .filter(a -> !a.inicio.toLocalDate().isAfter(janela.corteAtualFim()))
                        .toList()
                : listaPeriodo;

        List<Agendamento> listaComparacao = agenda.findDetalhadosNoPeriodo(
                        janela.comparacaoInicio().atStartOfDay(), janela.comparacaoFim().plusDays(1).atStartOfDay())
                .stream()
                .filter(a -> filtroBarbeiro == null || a.barbeiro.getId().equals(filtroBarbeiro.getId()))
                .toList();

        List<Agendamento> listaHoje = agenda.findDetalhadosNoPeriodo(
                        hoje.atStartOfDay(), hoje.plusDays(1).atStartOfDay())
                .stream()
                .filter(a -> filtroBarbeiro == null || a.barbeiro.getId().equals(filtroBarbeiro.getId()))
                .toList();

        List<Bloqueio> bloqueiosPeriodo = bloqueios.findComBarbeiroNoIntervalo(
                janela.fim().plusDays(1).atStartOfDay(), janela.inicio().atStartOfDay());
        List<Bloqueio> bloqueiosHoje = bloqueios.findComBarbeiroNoIntervalo(
                hoje.plusDays(1).atStartOfDay(), hoje.atStartOfDay());

        List<Barbeiro> barbeirosEscopoCapacidade = determinarBarbeirosCapacidade(todosBarbeiros, filtroBarbeiro, listaPeriodo);
        CapacidadePeriodo capacidade = calcularCapacidadePublico(
                janela.inicio(), janela.fim(), barbeirosEscopoCapacidade, todosExpedientes, bloqueiosPeriodo);
        CapacidadePeriodo capacidadeDecorrida = janela.incompleto() && !janela.corteAtualFim().isBefore(janela.inicio())
                ? calcularCapacidadePublico(
                        janela.inicio(), janela.corteAtualFim(), barbeirosEscopoCapacidade, todosExpedientes, bloqueiosPeriodo)
                : capacidade;

        Map<Long, LocalDateTime> primeiroConcluidoPorCliente = new HashMap<>();
        Map<Long, Long> totalConcluidoPorCliente = new HashMap<>();
        for (Object[] linha : agenda.resumirHistoricoClientes(Status.CONCLUIDO, janela.fim().plusDays(1).atStartOfDay())) {
            Long cid = (Long) linha[0];
            LocalDateTime minInicio = (LocalDateTime) linha[1];
            Long qtd = (Long) linha[2];
            primeiroConcluidoPorCliente.put(cid, minInicio);
            totalConcluidoPorCliente.put(cid, qtd);
        }

        AtencaoOperacional operacaoHoje = montarOperacaoHoje(
                agora, hoje, listaHoje, todosBarbeiros, filtroBarbeiro, todosExpedientes, bloqueiosHoje);

        Indicadores indicadores = montarIndicadores(
                janela, hoje, listaPeriodo, listaCorteAtual, listaComparacao,
                capacidade, capacidadeDecorrida, primeiroConcluidoPorCliente, totalConcluidoPorCliente);

        List<PontoSerie> serie = montarSerieTemporal(janela, listaPeriodo);
        List<ItemStatus> distribuicaoStatus = montarDistribuicaoStatus(listaPeriodo);
        List<RankingServico> rankingServicos = montarRankingServicos(listaPeriodo, indicadores.valorServicosConcluidos());
        List<DesempenhoProfissional> desempenho = montarDesempenhoProfissionais(
                todosBarbeiros, filtroBarbeiro, listaPeriodo, capacidade, janela.inicio().isBefore(hoje));
        List<CelulaDemanda> mapaDemanda = montarMapaDemanda(
                janela.inicio(), janela.fim(), barbeirosEscopoCapacidade, todosExpedientes, bloqueiosPeriodo, listaPeriodo);
        ResumoFidelidadeClientes fidelidade = montarResumoFidelidade(loja, janela, indicadores);
        List<LimitacaoDado> limitacoes = montarLimitacoes(indicadores, filtroBarbeiro);

        ContextoPeriodo contexto = new ContextoPeriodo(
                periodo == null ? Periodo.ESTE_MES : periodo,
                janela.inicio(),
                janela.fim(),
                janela.comparacaoInicio(),
                janela.comparacaoFim(),
                janela.corteAtualFim(),
                janela.rotuloPeriodo(),
                janela.rotuloComparacao(),
                janela.metodologia(),
                FUSO_NEGOCIO,
                filtroBarbeiro == null ? null : filtroBarbeiro.getId(),
                filtroBarbeiro == null ? null : filtroBarbeiro.getNome(),
                janela.incompleto()
        );

        YearMonth mesReferencia = (periodo == Periodo.MES_ANTERIOR || periodo == Periodo.PERSONALIZADO)
                ? YearMonth.from(janela.inicio())
                : YearMonth.from(hoje);
        ResumoMetaMensal metaMes = metas.buscarMes(mesReferencia.getYear(), mesReferencia.getMonthValue());
        ContadoresRetencao retencaoResumo = retencao.contarResumoAgregado();
        long clientesProximos = contarClientesProximosMeta(loja);

        EntradaAnalise entradaInsights = new EntradaAnalise(
                hoje, contexto, operacaoHoje, indicadores, rankingServicos, desempenho,
                mapaDemanda, fidelidade, retencaoResumo, metaMes, loja, todosExpedientes,
                clientesProximos,
                listaCorteAtual.size(),
                contarStatus(listaCorteAtual, Status.CANCELADO),
                contarStatus(listaCorteAtual, Status.FALTOU),
                contarStatus(listaCorteAtual, Status.CONCLUIDO)
        );
        List<InsightNegocio> listaInsights = insights.gerarInsights(entradaInsights);
        ResumoNarrativo resumoNarrativo = insights.gerarResumoPeriodo(entradaInsights, listaInsights);

        return new ResumoPainel(
                agora, contexto, operacaoHoje, indicadores, serie, distribuicaoStatus,
                rankingServicos, desempenho, mapaDemanda, fidelidade, limitacoes,
                listaInsights, resumoNarrativo, metaMes
        );
    }

    private long contarClientesProximosMeta(Barbearia loja) {
        if (!loja.fidelidadeAtiva || loja.meta <= 0) return 0L;
        int janelaProxima = Math.max(1, loja.meta - 2);
        long count = 0;
        for (Object[] linha : movimentos.saldosPorCliente()) {
            long saldo = ((Number) linha[1]).longValue();
            if (saldo >= janelaProxima && saldo < loja.meta) {
                count++;
            }
        }
        return count;
    }

    static Janela resolverJanela(Periodo tipo, LocalDate inicioParam, LocalDate fimParam, LocalDate hoje) {
        return switch (tipo) {
            case HOJE -> {
                LocalDate ontem = hoje.minusDays(1);
                yield new Janela(
                        hoje, hoje, hoje, ontem, ontem,
                        "Hoje (" + DATA_BR_FMT.format(hoje) + ")",
                        "Ontem (" + DATA_BR_FMT.format(ontem) + ")",
                        "Comparação direta do dia atual com o dia anterior completo (" + DATA_BR_FMT.format(ontem) + ").",
                        false
                );
            }
            case ESTA_SEMANA -> {
                LocalDate ini = hoje.with(DayOfWeek.MONDAY);
                LocalDate fim = ini.plusDays(6);
                LocalDate corte = hoje.isBefore(fim) ? hoje : fim;
                long diasDecorridos = ChronoUnit.DAYS.between(ini, corte) + 1;
                LocalDate compIni = ini.minusWeeks(1);
                LocalDate compFim = compIni.plusDays(diasDecorridos - 1);
                boolean incompleto = hoje.isBefore(fim);
                yield new Janela(
                        ini, fim, corte, compIni, compFim,
                        "Esta semana (" + DIA_FMT.format(ini) + " a " + DIA_FMT.format(fim) + ")",
                        "Semana anterior equivalente (" + DIA_FMT.format(compIni) + " a " + DIA_FMT.format(compFim) + ")",
                        incompleto
                                ? "Semana em andamento: compara " + diasDecorridos + " dia(s) decorrido(s) com os primeiros " + diasDecorridos + " dia(s) da semana anterior."
                                : "Semana completa comparada à semana anterior.",
                        incompleto
                );
            }
            case ESTE_MES -> {
                LocalDate ini = hoje.withDayOfMonth(1);
                LocalDate fim = hoje.withDayOfMonth(hoje.lengthOfMonth());
                boolean incompleto = hoje.isBefore(fim);
                LocalDate corte = incompleto ? hoje : fim;
                LocalDate compIni = ini.minusMonths(1);
                int diaCorte = Math.min(corte.getDayOfMonth(), compIni.lengthOfMonth());
                LocalDate compFim = incompleto ? compIni.withDayOfMonth(diaCorte) : compIni.withDayOfMonth(compIni.lengthOfMonth());
                yield new Janela(
                        ini, fim, corte, compIni, compFim,
                        capitalizar(MES_ANO_FMT.format(ini)) + " (" + DIA_FMT.format(ini) + " a " + DIA_FMT.format(fim) + ")",
                        capitalizar(MES_ANO_FMT.format(compIni)) + " (" + DIA_FMT.format(compIni) + " a " + DIA_FMT.format(compFim) + ")",
                        incompleto
                                ? "Mês em andamento: compara de " + DIA_FMT.format(ini) + " a " + DIA_FMT.format(corte)
                                + " com o período equivalente do mês anterior (" + DIA_FMT.format(compIni) + " a " + DIA_FMT.format(compFim) + ")."
                                : "Mês completo comparado ao mês anterior completo.",
                        incompleto
                );
            }
            case MES_ANTERIOR -> {
                LocalDate ini = hoje.minusMonths(1).withDayOfMonth(1);
                LocalDate fim = ini.withDayOfMonth(ini.lengthOfMonth());
                LocalDate compIni = ini.minusMonths(1);
                LocalDate compFim = compIni.withDayOfMonth(compIni.lengthOfMonth());
                yield new Janela(
                        ini, fim, fim, compIni, compFim,
                        capitalizar(MES_ANO_FMT.format(ini)) + " (" + DIA_FMT.format(ini) + " a " + DIA_FMT.format(fim) + ")",
                        capitalizar(MES_ANO_FMT.format(compIni)) + " (" + DIA_FMT.format(compIni) + " a " + DIA_FMT.format(compFim) + ")",
                        "Mês anterior fechado comparado ao mês imediatamente precedente.",
                        false
                );
            }
            case PERSONALIZADO -> {
                if (inicioParam == null || fimParam == null) {
                    throw Regra.invalida("Informe a data inicial e a data final do período personalizado.");
                }
                if (fimParam.isBefore(inicioParam)) {
                    throw Regra.invalida("A data final deve ser igual ou posterior à data inicial.");
                }
                long diasTotais = ChronoUnit.DAYS.between(inicioParam, fimParam) + 1;
                if (diasTotais > 366) {
                    throw Regra.invalida("Consulte no máximo 366 dias por vez no painel.");
                }
                boolean parcial = !inicioParam.isAfter(hoje) && fimParam.isAfter(hoje);
                LocalDate corte = parcial ? hoje : fimParam;
                long diasComparacao = ChronoUnit.DAYS.between(inicioParam, corte) + 1;
                LocalDate compFim = inicioParam.minusDays(1);
                LocalDate compIni = compFim.minusDays(diasComparacao - 1);
                yield new Janela(
                        inicioParam, fimParam, corte, compIni, compFim,
                        DATA_BR_FMT.format(inicioParam) + " a " + DATA_BR_FMT.format(fimParam),
                        DATA_BR_FMT.format(compIni) + " a " + DATA_BR_FMT.format(compFim),
                        parcial
                                ? "Período personalizado inclui datas futuras: compara os " + diasComparacao + " dias até hoje com a janela imediatamente anterior."
                                : "Período personalizado de " + diasTotais + " dia(s) comparado aos " + diasTotais + " dias imediatamente anteriores.",
                        parcial
                );
            }
        };
    }

    private AtencaoOperacional montarOperacaoHoje(LocalDateTime agora, LocalDate hoje, List<Agendamento> listaHoje,
                                                  List<Barbeiro> todosBarbeiros, Barbeiro filtroBarbeiro,
                                                  List<Expediente> todosExpedientes, List<Bloqueio> bloqueiosHoje) {
        long aguardando = listaHoje.stream().filter(a -> a.status == Status.RESERVADO).count();
        long prontosConcluir = listaHoje.stream()
                .filter(a -> a.status == Status.CONFIRMADO && !a.fim.isAfter(agora))
                .count();
        long proximos = listaHoje.stream()
                .filter(a -> DisponibilidadeService.pendente(a) && a.fim.isAfter(agora))
                .count();
        long canceladosFaltas = listaHoje.stream()
                .filter(a -> a.status == Status.CANCELADO || a.status == Status.FALTOU)
                .count();

        List<Barbeiro> ativosFiltro = todosBarbeiros.stream()
                .filter(b -> b.ativo && (filtroBarbeiro == null || b.getId().equals(filtroBarbeiro.getId())))
                .toList();
        CapacidadePeriodo capHoje = calcularCapacidadePublico(hoje, hoje, ativosFiltro, todosExpedientes, bloqueiosHoje);

        long minutosLivresRestantes = 0;
        LocalDateTime fimHoje = hoje.plusDays(1).atStartOfDay();
        for (Barbeiro b : ativosFiltro) {
            List<Faixa> abertasRestantes = cortarAntes(
                    intervalosDisponiveisDia(hoje, b.getId(), todosExpedientes, bloqueiosHoje), agora, fimHoje);
            List<Faixa> ocupadosPendentes = listaHoje.stream()
                    .filter(a -> a.barbeiro.getId().equals(b.getId()) && DisponibilidadeService.pendente(a))
                    .map(a -> new Faixa(a.inicio, a.fim))
                    .toList();
            List<Faixa> livres = subtrair(abertasRestantes, ocupadosPendentes);
            minutosLivresRestantes += livres.stream().mapToLong(Faixa::minutos).sum();
        }

        List<AgendaService.View> agendaViews = listaHoje.stream()
                .sorted(Comparator.comparing((Agendamento a) -> prioridadeHoje(a, agora))
                        .thenComparing(a -> a.inicio))
                .map(a -> new AgendaService.View(
                        a.id, a.cliente.getId(), a.cliente.getNome(),
                        a.barbeiro.getId(), a.barbeiro.getNome(),
                        a.servico.getId(), a.nomeServico, a.preco,
                        a.inicio, a.fim, a.status, a.beneficio,
                        DisponibilidadeService.pendente(a)))
                .toList();

        return new AtencaoOperacional(
                aguardando, prontosConcluir, proximos, canceladosFaltas,
                minutosLivresRestantes, capHoje.minutosDisponiveis(), agendaViews
        );
    }

    private int prioridadeHoje(Agendamento a, LocalDateTime agora) {
        if (a.status == Status.CONFIRMADO && !a.fim.isAfter(agora)) return 0;
        if (a.status == Status.RESERVADO) return 1;
        if (a.status == Status.CONFIRMADO) return 2;
        if (a.status == Status.CONCLUIDO) return 3;
        return 4;
    }

    private Indicadores montarIndicadores(Janela janela, LocalDate hoje,
                                          List<Agendamento> listaPeriodo, List<Agendamento> listaCorte,
                                          List<Agendamento> listaComparacao, CapacidadePeriodo capacidade,
                                          CapacidadePeriodo capacidadeDecorrida,
                                          Map<Long, LocalDateTime> primeiroConcluido,
                                          Map<Long, Long> totalConcluidoPorCliente) {
        long total = listaPeriodo.size();
        long concluidos = contarStatus(listaPeriodo, Status.CONCLUIDO);
        long concluidosBeneficio = listaPeriodo.stream().filter(a -> a.status == Status.CONCLUIDO && a.beneficio).count();
        long concluidosPagos = concluidos - concluidosBeneficio;
        long pendentes = contarStatus(listaPeriodo, Status.RESERVADO);
        long confirmados = contarStatus(listaPeriodo, Status.CONFIRMADO);
        long cancelados = contarStatus(listaPeriodo, Status.CANCELADO);
        long faltas = contarStatus(listaPeriodo, Status.FALTOU);

        BigDecimal valorConcluidos = somarValor(listaPeriodo, EnumSet.of(Status.CONCLUIDO));
        BigDecimal valorPrevisto = somarValor(listaPeriodo, EnumSet.of(Status.RESERVADO, Status.CONFIRMADO));
        BigDecimal ticketMedio = concluidosPagos > 0
                ? valorConcluidos.divide(BigDecimal.valueOf(concluidosPagos), 2, RoundingMode.HALF_UP)
                : null;

        long baseComparecimento = concluidos + faltas;
        BigDecimal taxaComparecimento = baseComparecimento > 0
                ? BigDecimal.valueOf(concluidos).multiply(CEM).divide(BigDecimal.valueOf(baseComparecimento), 1, RoundingMode.HALF_UP)
                : null;

        // Auditoria Stage 16.1: evita que reservas futuras não transcorridas diluam a taxa de cancelamentos e faltas.
        List<Agendamento> basePerdas = listaCorte.isEmpty() ? listaPeriodo : listaCorte;
        long basePerdasTotal = basePerdas.size();
        long perdasBase = contarStatus(basePerdas, Status.CANCELADO) + contarStatus(basePerdas, Status.FALTOU);
        BigDecimal taxaCancelamento = basePerdasTotal > 0
                ? BigDecimal.valueOf(perdasBase).multiply(CEM).divide(BigDecimal.valueOf(basePerdasTotal), 1, RoundingMode.HALF_UP)
                : null;

        Set<Long> unicosIds = listaPeriodo.stream()
                .filter(a -> a.status == Status.CONCLUIDO)
                .map(a -> a.cliente.getId())
                .collect(Collectors.toSet());
        long clientesUnicos = unicosIds.size();
        long recorrentes = unicosIds.stream()
                .filter(id -> totalConcluidoPorCliente.getOrDefault(id, 0L) >= 2)
                .count();
        LocalDateTime iniTs = janela.inicio().atStartOfDay();
        LocalDateTime fimTs = janela.fim().plusDays(1).atStartOfDay();
        long primeirosAtendimentos = unicosIds.stream()
                .filter(id -> {
                    LocalDateTime min = primeiroConcluido.get(id);
                    return min != null && !min.isBefore(iniTs) && min.isBefore(fimTs);
                })
                .count();

        long novosCadastros = usuarios.contarClientesCriadosNoPeriodo(iniTs, fimTs);
        long semDataHistorica = usuarios.contarClientesSemDataCadastro();

        // Auditoria Stage 16.1: mescla intervalos por profissional para não duplicar minutos sobrepostos.
        long minutosOcupados = minutosOcupadosUnificados(listaPeriodo);
        BigDecimal ocupacao = capacidade.minutosDisponiveis() > 0
                ? BigDecimal.valueOf(minutosOcupados).multiply(CEM)
                        .divide(BigDecimal.valueOf(capacidade.minutosDisponiveis()), 1, RoundingMode.HALF_UP)
                : null;

        long minutosOcupadosDecorridos = minutosOcupadosUnificados(listaCorte);
        long minutosDisponiveisDecorridos = capacidadeDecorrida.minutosDisponiveis();
        BigDecimal ocupacaoDecorrida = minutosDisponiveisDecorridos > 0
                ? BigDecimal.valueOf(minutosOcupadosDecorridos).multiply(CEM)
                        .divide(BigDecimal.valueOf(minutosDisponiveisDecorridos), 1, RoundingMode.HALF_UP)
                : null;

        long corteTotal = listaCorte.size();
        long compTotal = listaComparacao.size();
        long corteConc = contarStatus(listaCorte, Status.CONCLUIDO);
        long compConc = contarStatus(listaComparacao, Status.CONCLUIDO);
        BigDecimal corteVal = somarValor(listaCorte, EnumSet.of(Status.CONCLUIDO));
        BigDecimal compVal = somarValor(listaComparacao, EnumSet.of(Status.CONCLUIDO));
        long corteClientes = listaCorte.stream().filter(a -> a.status == Status.CONCLUIDO).map(a -> a.cliente.getId()).distinct().count();
        long compClientes = listaComparacao.stream().filter(a -> a.status == Status.CONCLUIDO).map(a -> a.cliente.getId()).distinct().count();

        return new Indicadores(
                total, concluidos, concluidosPagos, concluidosBeneficio, pendentes, confirmados, cancelados, faltas,
                valorConcluidos, valorPrevisto, ticketMedio, taxaComparecimento, taxaCancelamento,
                clientesUnicos, recorrentes, primeirosAtendimentos, novosCadastros, semDataHistorica,
                minutosOcupados, capacidade.minutosDisponiveis(), capacidade.minutosBloqueados(),
                ocupacao, janela.inicio().isBefore(hoje),
                minutosOcupadosDecorridos, minutosDisponiveisDecorridos, ocupacaoDecorrida,
                variacao(BigDecimal.valueOf(corteTotal), BigDecimal.valueOf(compTotal), 0),
                variacao(BigDecimal.valueOf(corteConc), BigDecimal.valueOf(compConc), 0),
                variacao(corteVal, compVal, 2),
                variacao(BigDecimal.valueOf(corteClientes), BigDecimal.valueOf(compClientes), 0)
        );
    }

    private List<PontoSerie> montarSerieTemporal(Janela janela, List<Agendamento> listaPeriodo) {
        long dias = ChronoUnit.DAYS.between(janela.inicio(), janela.fim()) + 1;
        List<PontoSerie> pontos = new ArrayList<>();

        if (dias == 1) {
            LocalDate dia = janela.inicio();
            int hMin = 8;
            int hMax = 20;
            for (Agendamento a : listaPeriodo) {
                hMin = Math.min(hMin, a.inicio.getHour());
                hMax = Math.max(hMax, a.inicio.getHour());
            }
            for (int h = hMin; h <= hMax; h++) {
                int hora = h;
                List<Agendamento> sub = listaPeriodo.stream().filter(a -> a.inicio.getHour() == hora).toList();
                pontos.add(ponto(String.format("%02dh", h), dia, dia, sub));
            }
            return pontos;
        }

        if (dias <= 62) {
            for (LocalDate d = janela.inicio(); !d.isAfter(janela.fim()); d = d.plusDays(1)) {
                LocalDate dia = d;
                List<Agendamento> sub = listaPeriodo.stream().filter(a -> a.inicio.toLocalDate().equals(dia)).toList();
                pontos.add(ponto(DIA_FMT.format(dia), dia, dia, sub));
            }
            return pontos;
        }

        for (LocalDate cursor = janela.inicio(); !cursor.isAfter(janela.fim()); cursor = cursor.plusDays(7)) {
            LocalDate iniBloco = cursor;
            LocalDate fimBloco = cursor.plusDays(6).isAfter(janela.fim()) ? janela.fim() : cursor.plusDays(6);
            List<Agendamento> sub = listaPeriodo.stream()
                    .filter(a -> !a.inicio.toLocalDate().isBefore(iniBloco) && !a.inicio.toLocalDate().isAfter(fimBloco))
                    .toList();
            pontos.add(ponto(DIA_FMT.format(iniBloco), iniBloco, fimBloco, sub));
        }
        return pontos;
    }

    private PontoSerie ponto(String rotulo, LocalDate inicio, LocalDate fim, List<Agendamento> sub) {
        return new PontoSerie(
                rotulo, inicio, fim, sub.size(),
                contarStatus(sub, Status.CONCLUIDO),
                contarStatus(sub, Status.CONFIRMADO),
                contarStatus(sub, Status.RESERVADO),
                contarStatus(sub, Status.CANCELADO),
                contarStatus(sub, Status.FALTOU),
                somarValor(sub, EnumSet.of(Status.CONCLUIDO)),
                somarValor(sub, EnumSet.of(Status.RESERVADO, Status.CONFIRMADO))
        );
    }

    private List<ItemStatus> montarDistribuicaoStatus(List<Agendamento> listaPeriodo) {
        long total = listaPeriodo.size();
        List<Map.Entry<Status, String>> ordem = List.of(
                Map.entry(Status.CONCLUIDO, "Concluídos"),
                Map.entry(Status.CONFIRMADO, "Confirmados"),
                Map.entry(Status.RESERVADO, "Aguardando confirmação"),
                Map.entry(Status.CANCELADO, "Cancelados"),
                Map.entry(Status.FALTOU, "Faltas")
        );
        List<ItemStatus> itens = new ArrayList<>();
        for (var par : ordem) {
            long qtd = contarStatus(listaPeriodo, par.getKey());
            BigDecimal pct = total > 0
                    ? BigDecimal.valueOf(qtd).multiply(CEM).divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
            itens.add(new ItemStatus(par.getKey().name(), par.getValue(), qtd, pct));
        }
        return itens;
    }

    private List<RankingServico> montarRankingServicos(List<Agendamento> listaPeriodo, BigDecimal valorTotalConcluido) {
        Map<Long, List<Agendamento>> porServico = listaPeriodo.stream()
                .collect(Collectors.groupingBy(a -> a.servico.getId()));
        long totalGeral = listaPeriodo.size();
        return porServico.entrySet().stream()
                .map(entry -> {
                    List<Agendamento> itens = entry.getValue();
                    String nomeServicoCat = itens.getFirst().servico.getNome();
                    String nome = (nomeServicoCat != null && !nomeServicoCat.isBlank())
                            ? nomeServicoCat
                            : itens.getFirst().nomeServico;
                    long total = itens.size();
                    long concluidos = contarStatus(itens, Status.CONCLUIDO);
                    long beneficio = itens.stream().filter(a -> a.status == Status.CONCLUIDO && a.beneficio).count();
                    long perdas = itens.stream().filter(a -> a.status == Status.CANCELADO || a.status == Status.FALTOU).count();
                    BigDecimal valor = somarValor(itens, EnumSet.of(Status.CONCLUIDO));
                    long minutosConcluidosPagos = itens.stream()
                            .filter(a -> a.status == Status.CONCLUIDO && !a.beneficio)
                            .mapToLong(PainelService::duracaoMinutos)
                            .sum();
                    BigDecimal valorHora = minutosConcluidosPagos > 0
                            ? valor.multiply(SESSENTA).divide(BigDecimal.valueOf(minutosConcluidosPagos), 2, RoundingMode.HALF_UP)
                            : null;
                    BigDecimal share = totalGeral > 0
                            ? BigDecimal.valueOf(total).multiply(CEM).divide(BigDecimal.valueOf(totalGeral), 1, RoundingMode.HALF_UP)
                            : BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
                    if (valorTotalConcluido.compareTo(BigDecimal.ZERO) == 0 && total == 0) {
                        share = BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
                    }
                    return new RankingServico(entry.getKey(), nome, total, concluidos, beneficio, perdas, valor, share, valorHora);
                })
                .sorted(Comparator.comparingLong(RankingServico::totalAgendamentos).reversed()
                        .thenComparing(RankingServico::concluidos, Comparator.reverseOrder())
                        .thenComparing(RankingServico::valorConcluidos, Comparator.reverseOrder())
                        .thenComparing(RankingServico::nome))
                .toList();
    }

    private List<DesempenhoProfissional> montarDesempenhoProfissionais(
            List<Barbeiro> todosBarbeiros, Barbeiro filtroBarbeiro,
            List<Agendamento> listaPeriodo, CapacidadePeriodo capacidade, boolean historico) {
        Map<Long, List<Agendamento>> porBarbeiro = listaPeriodo.stream()
                .collect(Collectors.groupingBy(a -> a.barbeiro.getId()));

        List<Barbeiro> alvos = todosBarbeiros.stream()
                .filter(b -> filtroBarbeiro == null
                        ? (b.ativo || porBarbeiro.containsKey(b.getId()))
                        : b.getId().equals(filtroBarbeiro.getId()))
                .toList();

        return alvos.stream().map(b -> {
            List<Agendamento> itens = porBarbeiro.getOrDefault(b.getId(), List.of());
            long total = itens.size();
            long concluidos = contarStatus(itens, Status.CONCLUIDO);
            long concluidosPagos = itens.stream().filter(a -> a.status == Status.CONCLUIDO && !a.beneficio).count();
            long pendentes = itens.stream().filter(DisponibilidadeService::pendente).count();
            long perdas = itens.stream().filter(a -> a.status == Status.CANCELADO || a.status == Status.FALTOU).count();
            long minAgendados = minutosOcupadosUnificados(itens);
            long minDisp = capacidade.disponivelPorBarbeiro().getOrDefault(b.getId(), 0L);
            BigDecimal ocupacao = minDisp > 0
                    ? BigDecimal.valueOf(minAgendados).multiply(CEM).divide(BigDecimal.valueOf(minDisp), 1, RoundingMode.HALF_UP)
                    : null;
            BigDecimal valor = somarValor(itens, EnumSet.of(Status.CONCLUIDO));
            BigDecimal ticket = concluidosPagos > 0
                    ? valor.divide(BigDecimal.valueOf(concluidosPagos), 2, RoundingMode.HALF_UP)
                    : null;
            String obs = !b.ativo
                    ? "Profissional inativo no catálogo atual"
                    : minDisp == 0
                    ? "Sem expediente disponível no período"
                    : historico
                    ? "Ocupação baseada no expediente semanal vigente"
                    : "Baseada na interseção real de expedientes e bloqueios";
            return new DesempenhoProfissional(
                    b.getId(), b.getNome(), b.ativo, total, concluidos, pendentes, perdas,
                    minAgendados, minDisp, ocupacao, valor, ticket, obs
            );
        }).sorted(Comparator.comparing(DesempenhoProfissional::valorConcluidos, Comparator.reverseOrder())
                .thenComparing(DesempenhoProfissional::concluidos, Comparator.reverseOrder())
                .thenComparing(DesempenhoProfissional::nome))
                .toList();
    }

    private List<CelulaDemanda> montarMapaDemanda(LocalDate inicio, LocalDate fim, List<Barbeiro> barbeirosEscopo,
                                                  List<Expediente> todosExpedientes, List<Bloqueio> bloqueiosPeriodo,
                                                  List<Agendamento> listaPeriodo) {
        int horaMin = 8;
        int horaMax = 20;
        for (Expediente e : todosExpedientes) {
            if (e.inicio != null && e.fim != null) {
                horaMin = Math.min(horaMin, (e.inicio.getHour() / 2) * 2);
                int fimArred = ((e.fim.getMinute() > 0 ? e.fim.getHour() + 1 : e.fim.getHour()) + 1) / 2 * 2;
                horaMax = Math.max(horaMax, Math.min(24, fimArred));
            }
        }
        List<int[]> faixasHoras = new ArrayList<>();
        for (int h = horaMin; h < horaMax; h += 2) {
            faixasHoras.add(new int[]{h, Math.min(24, h + 2)});
        }

        List<Agendamento> ativos = listaPeriodo.stream().filter(PainelService::ocupaAgenda).toList();
        boolean poucosDados = ativos.size() < 3;

        Map<DayOfWeek, String> nomeDia = Map.of(
                DayOfWeek.MONDAY, "Seg",
                DayOfWeek.TUESDAY, "Ter",
                DayOfWeek.WEDNESDAY, "Qua",
                DayOfWeek.THURSDAY, "Qui",
                DayOfWeek.FRIDAY, "Sex",
                DayOfWeek.SATURDAY, "Sáb",
                DayOfWeek.SUNDAY, "Dom"
        );

        Map<String, Long> disponivelCelula = new HashMap<>();
        Map<String, Long> ocupadoCelula = new HashMap<>();
        Map<String, Long> atendimentosCelula = new HashMap<>();

        Map<Long, List<Faixa>> faixasPorBarbeiro = new HashMap<>();
        for (Agendamento a : ativos) {
            if (a.inicio != null && a.fim != null && a.inicio.isBefore(a.fim)) {
                faixasPorBarbeiro.computeIfAbsent(a.barbeiro.getId(), k -> new ArrayList<>())
                        .add(new Faixa(a.inicio, a.fim));
            }
        }
        faixasPorBarbeiro.replaceAll((id, lista) -> unificar(lista));

        for (LocalDate d = inicio; !d.isAfter(fim); d = d.plusDays(1)) {
            DayOfWeek dow = d.getDayOfWeek();
            for (Barbeiro b : barbeirosEscopo) {
                if (!b.ativo) continue;
                List<Faixa> dispDia = intervalosDisponiveisDia(d, b.getId(), todosExpedientes, bloqueiosPeriodo);
                List<Faixa> ocupBarbeiro = faixasPorBarbeiro.getOrDefault(b.getId(), List.of());
                for (int[] fh : faixasHoras) {
                    LocalDateTime winIni = d.atTime(fh[0], 0);
                    LocalDateTime winFim = fh[1] == 24 ? d.plusDays(1).atStartOfDay() : d.atTime(fh[1], 0);
                    long minsDisp = cortarAntes(dispDia, winIni, winFim).stream().mapToLong(Faixa::minutos).sum();
                    if (minsDisp > 0) {
                        String key = dow.name() + "|" + fh[0];
                        disponivelCelula.merge(key, minsDisp, Long::sum);
                        long minsOcup = cortarAntes(ocupBarbeiro, winIni, winFim).stream().mapToLong(Faixa::minutos).sum();
                        if (minsOcup > 0) {
                            ocupadoCelula.merge(key, Math.min(minsDisp, minsOcup), Long::sum);
                        }
                    }
                }
            }
        }

        for (Agendamento a : ativos) {
            LocalDate d = a.inicio.toLocalDate();
            DayOfWeek dow = d.getDayOfWeek();
            for (int[] fh : faixasHoras) {
                LocalDateTime winIni = d.atTime(fh[0], 0);
                LocalDateTime winFim = fh[1] == 24 ? d.plusDays(1).atStartOfDay() : d.atTime(fh[1], 0);
                if (!a.inicio.isBefore(winIni) && a.inicio.isBefore(winFim)) {
                    atendimentosCelula.merge(dow.name() + "|" + fh[0], 1L, Long::sum);
                }
            }
        }

        List<CelulaDemanda> celulas = new ArrayList<>();
        for (int[] fh : faixasHoras) {
            String faixaRotulo = String.format("%02d–%02dh", fh[0], fh[1]);
            for (DayOfWeek dow : DayOfWeek.values()) {
                String key = dow.name() + "|" + fh[0];
                long disp = disponivelCelula.getOrDefault(key, 0L);
                long ocup = ocupadoCelula.getOrDefault(key, 0L);
                long atends = atendimentosCelula.getOrDefault(key, 0L);
                BigDecimal pct = disp > 0
                        ? BigDecimal.valueOf(ocup).multiply(CEM).divide(BigDecimal.valueOf(disp), 1, RoundingMode.HALF_UP)
                        : null;
                String nivel;
                if (disp == 0) {
                    nivel = "FECHADO";
                } else if (poucosDados && ocup == 0) {
                    nivel = "DADOS_INSUFICIENTES";
                } else if (pct.compareTo(new BigDecimal("65.0")) >= 0) {
                    nivel = "ALTA";
                } else if (pct.compareTo(new BigDecimal("25.0")) >= 0) {
                    nivel = "MEDIA";
                } else {
                    nivel = "BAIXA";
                }
                celulas.add(new CelulaDemanda(dow, nomeDia.get(dow), fh[0], fh[1], faixaRotulo, atends, ocup, disp, pct, nivel));
            }
        }
        return celulas;
    }

    private ResumoFidelidadeClientes montarResumoFidelidade(Barbearia loja, Janela janela, Indicadores ind) {
        LocalDateTime iniTs = janela.inicio().atStartOfDay();
        LocalDateTime fimTs = janela.fim().plusDays(1).atStartOfDay();
        return new ResumoFidelidadeClientes(
                loja.fidelidadeAtiva,
                loja.meta,
                loja.premio == null ? null : loja.premio.getNome(),
                ind.clientesUnicosAtendidos(),
                ind.primeirosAtendimentos(),
                ind.clientesRecorrentes(),
                ind.novosCadastros(),
                ind.cadastrosSemDataHistorica(),
                movimentos.contarParticipantesDistintos(),
                movimentos.contarClientesComRecompensaDisponivel(),
                movimentos.contarPorTipoNoPeriodo(Tipo.RECOMPENSA, iniTs, fimTs),
                movimentos.contarRecompensasResgatadasNoPeriodo(iniTs, fimTs),
                movimentos.contarPorTipoNoPeriodo(Tipo.CREDITO, iniTs, fimTs)
        );
    }

    private List<LimitacaoDado> montarLimitacoes(Indicadores ind, Barbeiro filtroBarbeiro) {
        List<LimitacaoDado> lista = new ArrayList<>();
        lista.add(new LimitacaoDado(
                "PRECO_SERVICO",
                "Valores baseados no preço registrado nos atendimentos",
                "O sistema não registra pagamentos recebidos, formas de pagamento, estornos, comissões ou despesas. Os valores exibidos refletem o preço gravado no agendamento (R$ 0,00 para resgates de fidelidade)."
        ));
        if (ind.ocupacaoEstimadaHistorica()) {
            lista.add(new LimitacaoDado(
                    "OCUPACAO_ESTIMADA",
                    "Capacidade histórica estimada pelo expediente vigente",
                    "Alterações antigas na grade de expediente não são versionadas no banco; bloqueios pontuais históricos são considerados, porém o expediente base reflete a configuração atual."
            ));
        }
        if (ind.cadastrosSemDataHistorica() > 0) {
            lista.add(new LimitacaoDado(
                    "CADASTRO_LEGADO",
                    ind.cadastrosSemDataHistorica() + " conta(s) de cliente sem data de cadastro",
                    "Contas legadas anteriores à criação da coluna criado_em não possuem carimbo histórico e não são estimadas na métrica de novos cadastros."
            ));
        }
        if (filtroBarbeiro != null) {
            lista.add(new LimitacaoDado(
                    "FILTRO_PROFISSIONAL",
                    "Escopo filtrado por profissional (" + filtroBarbeiro.getNome() + ")",
                    "Agendamentos, ocupação, serviços e clientes atendidos refletem apenas o profissional selecionado; novos cadastros, participação na fidelidade e contadores de retenção permanecem referenciados à barbearia."
            ));
        }
        return lista;
    }

    public static CalendarioMes calendarioOperacionalMes(YearMonth ym, LocalDateTime agora, List<Barbeiro> ativos,
                                                          List<Expediente> todosExpedientes, List<Bloqueio> bloqueiosMes) {
        LocalDate ini = ym.atDay(1);
        LocalDate fim = ym.atEndOfMonth();
        LocalDate hoje = agora.toLocalDate();
        int totais = 0;
        int decorridos = 0;
        int restantes = 0;

        for (LocalDate d = ini; !d.isAfter(fim); d = d.plusDays(1)) {
            long minDisp = 0;
            for (Barbeiro b : ativos) {
                if (!b.ativo) continue;
                minDisp += intervalosDisponiveisDia(d, b.getId(), todosExpedientes, bloqueiosMes)
                        .stream().mapToLong(Faixa::minutos).sum();
            }
            if (minDisp <= 0) continue;
            totais++;
            if (d.isBefore(hoje)) {
                decorridos++;
            } else if (d.equals(hoje)) {
                decorridos++;
                LocalDateTime fimHoje = d.plusDays(1).atStartOfDay();
                long minRestanteHoje = 0;
                for (Barbeiro b : ativos) {
                    if (!b.ativo) continue;
                    minRestanteHoje += cortarAntes(
                            intervalosDisponiveisDia(d, b.getId(), todosExpedientes, bloqueiosMes), agora, fimHoje)
                            .stream().mapToLong(Faixa::minutos).sum();
                }
                if (minRestanteHoje > 0) restantes++;
            } else {
                restantes++;
            }
        }
        return new CalendarioMes(totais, decorridos, restantes);
    }

    public static CapacidadePeriodo calcularCapacidadePublico(LocalDate inicio, LocalDate fim, List<Barbeiro> barbeirosEscopo,
                                                              List<Expediente> todosExpedientes, List<Bloqueio> bloqueiosPeriodo) {
        long totalDisp = 0;
        long totalBloq = 0;
        Map<Long, Long> dispPorBarbeiro = new HashMap<>();
        Map<Long, Long> bloqPorBarbeiro = new HashMap<>();

        for (Barbeiro b : barbeirosEscopo) {
            if (!b.ativo) continue;
            long bDisp = 0;
            long bBloq = 0;
            for (LocalDate d = inicio; !d.isAfter(fim); d = d.plusDays(1)) {
                List<Faixa> base = intersecaoDia(d, b.getId(), todosExpedientes);
                if (base.isEmpty()) continue;
                long antes = base.stream().mapToLong(Faixa::minutos).sum();
                List<Faixa> aposBloqueios = aplicarBloqueios(d, b.getId(), base, bloqueiosPeriodo);
                long depois = aposBloqueios.stream().mapToLong(Faixa::minutos).sum();
                bDisp += depois;
                bBloq += Math.max(0L, antes - depois);
            }
            totalDisp += bDisp;
            totalBloq += bBloq;
            dispPorBarbeiro.put(b.getId(), bDisp);
            bloqPorBarbeiro.put(b.getId(), bBloq);
        }
        return new CapacidadePeriodo(totalDisp, totalBloq, dispPorBarbeiro, bloqPorBarbeiro);
    }

    public static long minutosOcupadosUnificados(List<Agendamento> lista) {
        Map<Long, List<Faixa>> porBarbeiro = new HashMap<>();
        for (Agendamento a : lista) {
            if (ocupaAgenda(a) && a.inicio != null && a.fim != null && a.inicio.isBefore(a.fim)) {
                porBarbeiro.computeIfAbsent(a.barbeiro.getId(), k -> new ArrayList<>())
                        .add(new Faixa(a.inicio, a.fim));
            }
        }
        long soma = 0;
        for (List<Faixa> faixas : porBarbeiro.values()) {
            soma += unificar(faixas).stream().mapToLong(Faixa::minutos).sum();
        }
        return soma;
    }

    private List<Barbeiro> determinarBarbeirosCapacidade(List<Barbeiro> todos, Barbeiro filtro, List<Agendamento> listaPeriodo) {
        if (filtro != null) return List.of(filtro);
        Set<Long> comAgenda = listaPeriodo.stream().map(a -> a.barbeiro.getId()).collect(Collectors.toSet());
        return todos.stream().filter(b -> b.ativo || comAgenda.contains(b.getId())).toList();
    }

    private static List<Faixa> intervalosDisponiveisDia(LocalDate dia, Long barbeiroId,
                                                        List<Expediente> todosExpedientes, List<Bloqueio> bloqueios) {
        List<Faixa> base = intersecaoDia(dia, barbeiroId, todosExpedientes);
        if (base.isEmpty()) return List.of();
        return aplicarBloqueios(dia, barbeiroId, base, bloqueios);
    }

    private static List<Faixa> intersecaoDia(LocalDate dia, Long barbeiroId, List<Expediente> todosExpedientes) {
        DayOfWeek dow = dia.getDayOfWeek();
        List<Faixa> loja = todosExpedientes.stream()
                .filter(e -> e.dia == dow && e.barbeiro == null && e.inicio != null && e.fim != null && e.inicio.isBefore(e.fim))
                .map(e -> new Faixa(dia.atTime(e.inicio), dia.atTime(e.fim)))
                .toList();
        List<Faixa> pessoal = todosExpedientes.stream()
                .filter(e -> e.dia == dow && e.barbeiro != null && e.barbeiro.getId().equals(barbeiroId)
                        && e.inicio != null && e.fim != null && e.inicio.isBefore(e.fim))
                .map(e -> new Faixa(dia.atTime(e.inicio), dia.atTime(e.fim)))
                .toList();
        if (loja.isEmpty() || pessoal.isEmpty()) return List.of();

        List<Faixa> intersecoes = new ArrayList<>();
        for (Faixa l : unificar(loja)) {
            for (Faixa p : unificar(pessoal)) {
                LocalDateTime ini = l.inicio().isAfter(p.inicio()) ? l.inicio() : p.inicio();
                LocalDateTime fim = l.fim().isBefore(p.fim()) ? l.fim() : p.fim();
                if (ini.isBefore(fim)) {
                    intersecoes.add(new Faixa(ini, fim));
                }
            }
        }
        return unificar(intersecoes);
    }

    private static List<Faixa> aplicarBloqueios(LocalDate dia, Long barbeiroId, List<Faixa> base, List<Bloqueio> bloqueios) {
        LocalDateTime diaIni = dia.atStartOfDay();
        LocalDateTime diaFim = dia.plusDays(1).atStartOfDay();
        List<Faixa> bloqs = bloqueios.stream()
                .filter(b -> b.barbeiro == null || b.barbeiro.getId().equals(barbeiroId))
                .map(b -> new Faixa(
                        b.inicio.isBefore(diaIni) ? diaIni : b.inicio,
                        b.fim.isAfter(diaFim) ? diaFim : b.fim))
                .filter(f -> f.inicio().isBefore(f.fim()))
                .toList();
        return subtrair(base, bloqs);
    }

    private static List<Faixa> cortarAntes(List<Faixa> base, LocalDateTime minIni, LocalDateTime maxFim) {
        if (minIni.isAfter(maxFim) || minIni.equals(maxFim)) return List.of();
        List<Faixa> out = new ArrayList<>();
        for (Faixa f : base) {
            LocalDateTime ini = f.inicio().isBefore(minIni) ? minIni : f.inicio();
            LocalDateTime fim = f.fim().isAfter(maxFim) ? maxFim : f.fim();
            if (ini.isBefore(fim)) out.add(new Faixa(ini, fim));
        }
        return out;
    }

    private static List<Faixa> unificar(List<Faixa> lista) {
        if (lista.size() <= 1) return lista;
        List<Faixa> ordenadas = lista.stream()
                .filter(f -> f.inicio().isBefore(f.fim()))
                .sorted(Comparator.comparing(Faixa::inicio).thenComparing(Faixa::fim))
                .toList();
        if (ordenadas.isEmpty()) return List.of();
        List<Faixa> merged = new ArrayList<>();
        Faixa atual = ordenadas.getFirst();
        for (int i = 1; i < ordenadas.size(); i++) {
            Faixa prox = ordenadas.get(i);
            if (!prox.inicio().isAfter(atual.fim())) {
                atual = new Faixa(atual.inicio(), prox.fim().isAfter(atual.fim()) ? prox.fim() : atual.fim());
            } else {
                merged.add(atual);
                atual = prox;
            }
        }
        merged.add(atual);
        return merged;
    }

    private static List<Faixa> subtrair(List<Faixa> base, List<Faixa> removidos) {
        if (base.isEmpty() || removidos.isEmpty()) return base;
        List<Faixa> atuais = unificar(base);
        for (Faixa r : unificar(removidos)) {
            List<Faixa> proximas = new ArrayList<>();
            for (Faixa f : atuais) {
                if (!r.inicio().isBefore(f.fim()) || !r.fim().isAfter(f.inicio())) {
                    proximas.add(f);
                    continue;
                }
                if (f.inicio().isBefore(r.inicio())) {
                    proximas.add(new Faixa(f.inicio(), r.inicio()));
                }
                if (f.fim().isAfter(r.fim())) {
                    proximas.add(new Faixa(r.fim(), f.fim()));
                }
            }
            atuais = proximas;
            if (atuais.isEmpty()) break;
        }
        return atuais;
    }

    private static Variacao variacao(BigDecimal atual, BigDecimal anterior, int escala) {
        BigDecimal delta = atual.subtract(anterior).setScale(escala, RoundingMode.HALF_UP);
        if (anterior.compareTo(BigDecimal.ZERO) == 0) {
            return new Variacao(atual.setScale(escala, RoundingMode.HALF_UP),
                    anterior.setScale(escala, RoundingMode.HALF_UP), delta, null, false,
                    "Sem base comparável no período anterior.");
        }
        BigDecimal pct = delta.multiply(CEM).divide(anterior, 1, RoundingMode.HALF_UP);
        return new Variacao(atual.setScale(escala, RoundingMode.HALF_UP),
                anterior.setScale(escala, RoundingMode.HALF_UP), delta, pct, true, null);
    }

    private static long contarStatus(List<Agendamento> lista, Status status) {
        return lista.stream().filter(a -> a.status == status).count();
    }

    private static BigDecimal somarValor(List<Agendamento> lista, Set<Status> statuses) {
        return lista.stream()
                .filter(a -> statuses.contains(a.status) && a.preco != null)
                .map(a -> a.preco)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private static boolean ocupaAgenda(Agendamento a) {
        return a.status == Status.RESERVADO || a.status == Status.CONFIRMADO || a.status == Status.CONCLUIDO;
    }

    private static long duracaoMinutos(Agendamento a) {
        if (a.inicio == null || a.fim == null || !a.inicio.isBefore(a.fim)) return 0L;
        return Duration.between(a.inicio, a.fim).toMinutes();
    }

    private static String capitalizar(String valor) {
        if (valor == null || valor.isBlank()) return "";
        return valor.substring(0, 1).toUpperCase(Locale.forLanguageTag("pt-BR")) + valor.substring(1);
    }
}
