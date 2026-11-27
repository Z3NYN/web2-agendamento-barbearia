package br.ueg.trindade.braully_web2_fullstack.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import org.springframework.stereotype.Service;
import br.ueg.trindade.braully_web2_fullstack.model.Barbearia;
import br.ueg.trindade.braully_web2_fullstack.model.Expediente;
import br.ueg.trindade.braully_web2_fullstack.service.MetaService.ItemProgressoMeta;
import br.ueg.trindade.braully_web2_fullstack.service.MetaService.ResumoMetaMensal;
import br.ueg.trindade.braully_web2_fullstack.service.PainelService.*;
import br.ueg.trindade.braully_web2_fullstack.service.RetencaoClienteService.ContadoresRetencao;

/**
 * Motor determinístico e transparente de insights gerenciais e resumo narrativo
 * baseado exclusivamente nos registros reais do banco de dados.
 */
@Service
public class InsightsNegocioService {

    public static final long MIN_MINUTOS_DISPONIVEIS_OCUPACAO = 360L;
    public static final long MIN_ATENDIMENTOS_DEMANDA = 5L;
    public static final long MIN_ATENDIMENTOS_PERDAS = 5L;
    public static final BigDecimal LIMIAR_CANCELAMENTO_PCT = new BigDecimal("20.0");
    public static final BigDecimal LIMIAR_FALTAS_PCT = new BigDecimal("15.0");
    public static final long MIN_BASE_CRESCIMENTO = 3L;
    public static final BigDecimal LIMIAR_CRESCIMENTO_PCT = new BigDecimal("15.0");
    public static final BigDecimal LIMIAR_BAIXA_OCUPACAO_PCT = new BigDecimal("25.0");
    public static final BigDecimal LIMIAR_ALTA_DEMANDA_CELULA_PCT = new BigDecimal("75.0");
    public static final int MIN_FAIXAS_ALTA_DEMANDA = 2;
    public static final long MIN_CONCLUIDOS_SERVICOS = 5L;
    public static final BigDecimal DIFERENCA_OCUPACAO_PROFISSIONAIS_PP = new BigDecimal("35.0");

    private static final BigDecimal CEM = new BigDecimal("100");
    private static final Set<DayOfWeek> DIAS_REFERENCIA = EnumSet.of(
            DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY, DayOfWeek.FRIDAY, DayOfWeek.SATURDAY
    );

    public record InsightNegocio(
            String id,
            String categoria,
            String severidade,
            int prioridade,
            String titulo,
            String oQueAconteceu,
            String porQueImporta,
            String oQueFazer,
            String evidencia,
            String amostra,
            String acaoRotulo,
            String acaoUrl,
            String permissaoAcao
    ) {}

    public record ResumoNarrativo(
            String manchete,
            List<String> resultadosPrincipais,
            String comparacaoAnterior,
            List<String> destaquesPositivos,
            List<String> pontosAtencao,
            String resumoMetas,
            List<String> prioridadesSugeridas
    ) {}

    public record EntradaAnalise(
            LocalDate hoje,
            ContextoPeriodo contexto,
            AtencaoOperacional operacaoHoje,
            Indicadores indicadores,
            List<RankingServico> rankingServicos,
            List<DesempenhoProfissional> desempenhoProfissionais,
            List<CelulaDemanda> mapaDemanda,
            ResumoFidelidadeClientes fidelidadeClientes,
            ContadoresRetencao retencao,
            ResumoMetaMensal metaMes,
            Barbearia loja,
            List<Expediente> todosExpedientes,
            long clientesProximosMeta,
            long corteTotal,
            long corteCancelados,
            long corteFaltas,
            long corteConcluidos
    ) {}

    public List<InsightNegocio> gerarInsights(EntradaAnalise in) {
        Map<String, InsightNegocio> mapa = new LinkedHashMap<>();
        String hojeIso = in.hoje().toString();
        String profQuery = in.contexto().barbeiroId() == null ? "" : "&barbeiroId=" + in.contexto().barbeiroId();

        // 1. Pendências operacionais imediatas do dia atual
        if (in.operacaoHoje().aguardandoConfirmacao() > 0 || in.operacaoHoje().prontosParaConcluir() > 0) {
            long pend = in.operacaoHoje().aguardandoConfirmacao();
            long concluir = in.operacaoHoje().prontosParaConcluir();
            String statusDestino = pend > 0 ? "RESERVADO" : "CONFIRMADO";
            StringBuilder ocorrido = new StringBuilder();
            if (pend > 0) ocorrido.append(pend).append(" reserva(s) de hoje aguardando confirmação");
            if (pend > 0 && concluir > 0) ocorrido.append(" e ");
            if (concluir > 0) ocorrido.append(concluir).append(" atendimento(s) já encerrado(s) aguardando conclusão");
            ocorrido.append(".");
            adicionar(mapa, new InsightNegocio(
                    "OPERACAO_HOJE_PENDENTE",
                    "AGENDA",
                    "ALTA",
                    1,
                    "Atendimentos de hoje pedem confirmação ou encerramento",
                    ocorrido.toString(),
                    "Reservas não confirmadas aumentam risco de esquecimento e atendimentos não concluídos atrasam atualização de indicadores e créditos de fidelidade.",
                    pend > 0
                            ? "Confirme as reservas pendentes de hoje e registre a conclusão dos horários já encerrados."
                            : "Registre a conclusão dos horários encerrados hoje na agenda.",
                    "Aguardando confirmação: " + pend + " · Prontos para concluir: " + concluir,
                    "Dia " + in.hoje(),
                    pend > 0 ? "Ver reservas pendentes" : "Concluir atendimentos",
                    "/agenda?data=" + hojeIso + "&status=" + statusDestino + profQuery,
                    "AGENDAMENTOS_CONSULTAR"
            ));
        }

        // 2. Cancelamentos elevados (separados de faltas)
        if (in.corteTotal() >= MIN_ATENDIMENTOS_PERDAS && in.corteCancelados() >= 2) {
            BigDecimal taxaCanc = percentual(in.corteCancelados(), in.corteTotal());
            if (taxaCanc.compareTo(LIMIAR_CANCELAMENTO_PCT) >= 0) {
                adicionar(mapa, new InsightNegocio(
                        "CANCELAMENTOS_ELEVADOS",
                        "CANCELAMENTOS",
                        "ALTA",
                        2,
                        "Taxa de cancelamentos exige acompanhamento",
                        in.corteCancelados() + " de " + in.corteTotal() + " agendamento(s) até " + in.contexto().corteAtualFim()
                                + " foram cancelados (" + taxaCanc + "%).",
                        "Cancelamentos recorrentes reduzem o aproveitamento da grade mesmo em horários com procura inicial.",
                        "Avalie a antecedência mínima configurada e revise horários em que os cancelamentos ocorrem com mais frequência.",
                        "Cancelados no recorte decorrido: " + in.corteCancelados() + " (" + taxaCanc + "%, limiar >= " + LIMIAR_CANCELAMENTO_PCT + "%)",
                        in.corteTotal() + " agendamento(s) decorrido(s)",
                        "Consultar cancelados na agenda",
                        "/agenda?data=" + hojeIso + "&status=CANCELADO" + profQuery,
                        "AGENDAMENTOS_CONSULTAR"
                ));
            }
        }

        // 3. Faltas (no-show) elevadas — analisadas separadamente de cancelamentos
        long baseComparecimentoCorte = in.corteConcluidos() + in.corteFaltas();
        if (baseComparecimentoCorte >= MIN_ATENDIMENTOS_PERDAS && in.corteFaltas() >= 2) {
            BigDecimal taxaFalta = percentual(in.corteFaltas(), baseComparecimentoCorte);
            if (taxaFalta.compareTo(LIMIAR_FALTAS_PCT) >= 0) {
                adicionar(mapa, new InsightNegocio(
                        "FALTAS_ELEVADAS",
                        "CANCELAMENTOS",
                        "ALTA",
                        3,
                        "Faltas sem aviso superam o limiar de atenção",
                        in.corteFaltas() + " falta(s) em " + baseComparecimentoCorte + " atendimento(s) encerrado(s) ou com falta (" + taxaFalta + "%).",
                        "Diferente do cancelamento prévio, a falta impede realocação do horário para outro cliente.",
                        "Reforce a rotina de confirmação no dia do atendimento e oriente os clientes a utilizar os lembretes do sistema.",
                        "Faltas: " + in.corteFaltas() + " · Concluídos: " + in.corteConcluidos() + " (limiar >= " + LIMIAR_FALTAS_PCT + "%)",
                        baseComparecimentoCorte + " atendimento(s)",
                        "Ver faltas na agenda",
                        "/agenda?data=" + hojeIso + "&status=FALTOU" + profQuery,
                        "AGENDAMENTOS_CONSULTAR"
                ));
            }
        }

        // 4. Retenção de clientes (contadores agregados — zero dados pessoais identificáveis)
        if (in.contexto().barbeiroId() == null && in.retencao().atrasados() > 0) {
            adicionar(mapa, new InsightNegocio(
                    "CLIENTES_RETORNO_ATRASADO",
                    "RETENCAO",
                    "ATENCAO",
                    4,
                    "Clientes com retorno acima do intervalo habitual",
                    in.retencao().atrasados() + " cliente(s) recorrente(s) com 3 ou mais visitas concluídas ultrapassaram seu intervalo mediano individual de retorno e ainda não possuem novo horário marcado.",
                    "Acompanhar clientes habituais cujo ritmo desacelerou ajuda a priorizar ações manuais de relacionamento sem presumir perda definitiva.",
                    "Consulte a lista filtrada de clientes com retorno acima do habitual para avaliar cada caso individualmente.",
                    in.retencao().atrasados() + " em atraso de " + in.retencao().totalClientes() + " cliente(s) cadastrado(s) ("
                            + in.retencao().retornoEsperado() + " dentro do ritmo esperado).",
                    "Base histórica de visitas concluídas",
                    "Consultar clientes",
                    "/clientes?status=RETORNO_ATRASADO",
                    "CLIENTES_GERENCIAR"
            ));
        }

        // 5. Baixa ocupação com capacidade real disponível (excluindo fechados e bloqueados)
        BigDecimal ocupacaoRef = in.indicadores().ocupacaoDecorridaPercentual() != null
                ? in.indicadores().ocupacaoDecorridaPercentual()
                : in.indicadores().ocupacaoPercentual();
        long minDispRef = in.indicadores().minutosDisponiveisDecorridos() > 0
                ? in.indicadores().minutosDisponiveisDecorridos()
                : in.indicadores().minutosDisponiveis();
        if (in.indicadores().totalAgendamentos() > 0 && minDispRef >= MIN_MINUTOS_DISPONIVEIS_OCUPACAO
                && ocupacaoRef != null && ocupacaoRef.compareTo(LIMIAR_BAIXA_OCUPACAO_PCT) < 0) {
            List<CelulaDemanda> celulasOciosas = in.mapaDemanda().stream()
                    .filter(c -> c.minutosDisponiveis() >= 120 && !"FECHADO".equals(c.nivel()))
                    .sorted(Comparator.comparing((CelulaDemanda c) -> c.ocupacaoPercentual() == null ? BigDecimal.ZERO : c.ocupacaoPercentual())
                            .thenComparing(CelulaDemanda::minutosDisponiveis, Comparator.reverseOrder()))
                    .limit(3)
                    .toList();
            String faixasTxt = celulasOciosas.isEmpty()
                    ? "nos dias com expediente aberto"
                    : celulasOciosas.stream()
                    .map(c -> c.rotuloDia() + " " + c.rotuloFaixa() + " (" + c.ocupacaoPercentual() + "%)")
                    .reduce((a, b) -> a + ", " + b).orElse("");
            adicionar(mapa, new InsightNegocio(
                    "AGENDA_BAIXA_OCUPACAO",
                    "AGENDA",
                    "ATENCAO",
                    5,
                    "Aproveite os horários abertos com baixa ocupação",
                    "A ocupação efetiva está em " + ocupacaoRef + "% frente à capacidade líquida aberta ("
                            + formatarMinutos(minDispRef) + "), com maior ociosidade em " + faixasTxt + ".",
                    "Há tempo produtivo disponível com profissionais escalados e sem bloqueios, que pode receber novos agendamentos.",
                    "Divulgue os horários livres dessas faixas nos canais da barbearia ou priorize encaixes nessas janelas.",
                    "Ocupação medida: " + ocupacaoRef + "% (limiar < " + LIMIAR_BAIXA_OCUPACAO_PCT + "%); bloqueios e horários fechados excluídos.",
                    formatarMinutos(minDispRef) + " de capacidade líquida",
                    "Consultar agenda",
                    "/agenda?data=" + hojeIso + profQuery,
                    "AGENDAMENTOS_CONSULTAR"
            ));
        }

        // 6. Alta demanda recorrente (exige ao menos 2 faixas com >=75% e >=5 atendimentos no período)
        long ativosPeriodo = in.indicadores().concluidos() + in.indicadores().confirmados() + in.indicadores().pendentes();
        if (ativosPeriodo >= MIN_ATENDIMENTOS_DEMANDA) {
            List<CelulaDemanda> faixasQuentes = in.mapaDemanda().stream()
                    .filter(c -> c.minutosDisponiveis() >= 120 && c.atendimentos() >= 2
                            && c.ocupacaoPercentual() != null
                            && c.ocupacaoPercentual().compareTo(LIMIAR_ALTA_DEMANDA_CELULA_PCT) >= 0)
                    .sorted(Comparator.comparing(CelulaDemanda::ocupacaoPercentual, Comparator.reverseOrder()))
                    .toList();
            if (faixasQuentes.size() >= MIN_FAIXAS_ALTA_DEMANDA) {
                String resumoFaixas = faixasQuentes.stream().limit(3)
                        .map(c -> c.rotuloDia() + " " + c.rotuloFaixa() + " (" + c.ocupacaoPercentual() + "%)")
                        .reduce((a, b) -> a + ", " + b).orElse("");
                adicionar(mapa, new InsightNegocio(
                        "AGENDA_PICO_DEMANDA",
                        "AGENDA",
                        "INFORMATIVO",
                        6,
                        "Faixas horárias concentrando alta procura",
                        "As janelas " + resumoFaixas + " operaram com ocupação igual ou superior a " + LIMIAR_ALTA_DEMANDA_CELULA_PCT + "%.",
                        "Picos recorrentes indicam onde a agenda enche mais rápido e ajudam a orientar clientes para faixas vizinhas ainda abertas.",
                        "Avalie se as escalas e intervalos nessas faixas atendem bem ao fluxo antes de qualquer alteração operacional.",
                        faixasQuentes.size() + " faixa(s) aberta(s) com ocupação >= " + LIMIAR_ALTA_DEMANDA_CELULA_PCT + "%.",
                        ativosPeriodo + " agendamento(s) ativo(s)/concluído(s)",
                        "Ver mapa de demanda",
                        "/desempenho",
                        "DASHBOARD_ANALITICO"
                ));
            }
        }

        // 7. Fidelidade: recompensas disponíveis e clientes próximos da meta
        if (in.fidelidadeClientes().programaAtivo()
                && (in.fidelidadeClientes().clientesComRecompensaDisponivel() > 0 || in.clientesProximosMeta() > 0)) {
            adicionar(mapa, new InsightNegocio(
                    "FIDELIDADE_RECOMPENSAS_DISPONIVEIS",
                    "FIDELIDADE",
                    "INFORMATIVO",
                    7,
                    "Recompensas prontas e clientes próximos da meta",
                    in.fidelidadeClientes().clientesComRecompensaDisponivel() + " cliente(s) possuem recompensa liberada para resgate e "
                            + in.clientesProximosMeta() + " estão a 1 ou 2 atendimentos de completar o cartão ("
                            + in.fidelidadeClientes().meta() + " selos).",
                    "Lembrar do benefício durante o atendimento presencial aumenta a percepção de valor do programa configurado.",
                    "Acompanhe os clientes elegíveis e oriente a equipe a informar benefícios disponíveis no balcão.",
                    "Resgates no período: " + in.fidelidadeClientes().recompensasResgatadasNoPeriodo()
                            + " · Participantes totais: " + in.fidelidadeClientes().participantesFidelidade(),
                    "Registros reais de MovimentoFidelidade",
                    "Acompanhar recompensas",
                    "/fidelidade-programa",
                    "FIDELIDADE_ADMINISTRAR"
            ));
        }

        // 8. Desempenho de serviços (popularidade vs valor/hora registrado)
        if (in.indicadores().concluidos() >= MIN_CONCLUIDOS_SERVICOS && !in.rankingServicos().isEmpty()) {
            RankingServico liderVolume = in.rankingServicos().getFirst();
            RankingServico liderHora = in.rankingServicos().stream()
                    .filter(s -> s.concluidos() >= 2 && s.valorPorHora() != null)
                    .max(Comparator.comparing(RankingServico::valorPorHora))
                    .orElse(null);
            String compHora = liderHora != null
                    ? " Maior valor por hora registrada: " + liderHora.nome() + " (R$ " + liderHora.valorPorHora() + "/h)."
                    : "";
            adicionar(mapa, new InsightNegocio(
                    "SERVICO_LIDER_DEMANDA",
                    "SERVICOS",
                    "INFORMATIVO",
                    8,
                    "Serviço que lidera a procura no período",
                    liderVolume.nome() + " concentrou " + liderVolume.participacaoPercentual() + "% dos agendamentos ("
                            + liderVolume.totalAgendamentos() + " reserva(s), " + liderVolume.concluidos() + " concluído(s))." + compHora,
                    "Separar volume de procura de valor por hora de execução ajuda a avaliar quais combinações ou destaques fazem sentido no catálogo, sem inferir margem líquida sem custos.",
                    "Avalie combos ou apresentações complementares no catálogo para os serviços mais buscados.",
                    "Valor concluído do líder: R$ " + liderVolume.valorConcluidos(),
                    in.indicadores().concluidos() + " atendimento(s) concluído(s)",
                    "Analisar serviços",
                    "/desempenho",
                    "DASHBOARD_ANALITICO"
            ));
        }

        // 9. Equilíbrio entre profissionais (respeitando carga disponível de cada um)
        if (in.contexto().barbeiroId() == null) {
            List<DesempenhoProfissional> elegiveis = in.desempenhoProfissionais().stream()
                    .filter(p -> p.ativo() && p.minutosDisponiveis() >= MIN_MINUTOS_DISPONIVEIS_OCUPACAO && p.ocupacaoPercentual() != null)
                    .toList();
            if (elegiveis.size() >= 2) {
                DesempenhoProfissional maior = elegiveis.stream().max(Comparator.comparing(DesempenhoProfissional::ocupacaoPercentual)).orElseThrow();
                DesempenhoProfissional menor = elegiveis.stream().min(Comparator.comparing(DesempenhoProfissional::ocupacaoPercentual)).orElseThrow();
                BigDecimal diff = maior.ocupacaoPercentual().subtract(menor.ocupacaoPercentual());
                if (diff.compareTo(DIFERENCA_OCUPACAO_PROFISSIONAIS_PP) >= 0) {
                    adicionar(mapa, new InsightNegocio(
                            "PROFISSIONAL_EQUILIBRIO_OCUPACAO",
                            "PROFISSIONAIS",
                            "INFORMATIVO",
                            9,
                            "Diferença relevante de ocupação entre profissionais",
                            maior.nome() + " registrou " + maior.ocupacaoPercentual() + "% de ocupação ("
                                    + formatarMinutos(maior.minutosDisponiveis()) + " disponíveis), enquanto "
                                    + menor.nome() + " registrou " + menor.ocupacaoPercentual() + "% ("
                                    + formatarMinutos(menor.minutosDisponiveis()) + " disponíveis).",
                            "A diferença considera a carga real de expediente de cada profissional e pode refletir preferência ou menor exposição das especialidades na vitrine.",
                            "Revise as especialidades e fotos apresentadas na equipe pública e avalie a indicação de 'Qualquer profissional' na recepção.",
                            "Diferença: " + diff + " p.p. (limiar >= " + DIFERENCA_OCUPACAO_PROFISSIONAIS_PP + " p.p.)",
                            elegiveis.size() + " profissionais com >= " + formatarMinutos(MIN_MINUTOS_DISPONIVEIS_OCUPACAO) + " abertos",
                            "Ver desempenho por profissional",
                            "/desempenho",
                            "DASHBOARD_ANALITICO"
                    ));
                }
            }
        }

        // 10. Destaques positivos baseados em comparação equivalente válida
        Variacao compValor = in.indicadores().compValorConcluidos();
        Variacao compConc = in.indicadores().compConcluidos();
        if (compConc.comparavel() && compConc.anterior().longValue() >= MIN_BASE_CRESCIMENTO
                && compConc.deltaPercentual() != null
                && compConc.deltaPercentual().compareTo(LIMIAR_CRESCIMENTO_PCT) >= 0) {
            adicionar(mapa, new InsightNegocio(
                    "EVOLUCAO_POSITIVA_ATENDIMENTOS",
                    "CRESCIMENTO",
                    "POSITIVO",
                    10,
                    "Crescimento consistente nos atendimentos concluídos",
                    "O volume concluído avançou " + compConc.deltaPercentual() + "% em relação ao período anterior equivalente ("
                            + compConc.anterior().longValue() + " → " + compConc.atual().longValue() + ").",
                    compValor.comparavel() && compValor.deltaPercentual() != null
                            ? "O valor dos serviços concluídos também variou " + compValor.deltaPercentual() + "% na mesma base de dias."
                            : "Indica avanço operacional real sobre base histórica comparável.",
                    "Mantenha a consistência de confirmação e acompanhe a capacidade livre para sustentar o ritmo.",
                    "Janela comparada: " + in.contexto().rotuloComparacao(),
                    compConc.atual().longValue() + " vs " + compConc.anterior().longValue() + " concluídos",
                    "Ver desempenho",
                    "/desempenho",
                    "DASHBOARD_ANALITICO"
            ));
        }

        // 11. Progresso positivo de metas configuradas
        if (in.metaMes() != null && in.metaMes().configurada()) {
            in.metaMes().itens().stream()
                    .filter(ItemProgressoMeta::atingida)
                    .findFirst()
                    .ifPresent(item -> adicionar(mapa, new InsightNegocio(
                            "META_MENSAL_ATINGIDA",
                            "METAS",
                            "POSITIVO",
                            11,
                            "Meta mensal alcançada: " + item.rotulo(),
                            "O resultado atual de " + item.rotulo() + " já atingiu " + item.percentualAtingido() + "% do objetivo definido para " + in.metaMes().rotuloMes() + ".",
                            "Acompanhar metas mensais reais permite validar se o ritmo planejado foi atingido sem projeções artificiais.",
                            "Revise o progresso das demais metas do mês ou planeje os objetivos do próximo mês preservando este histórico.",
                            "Atual: " + item.atual() + " / Meta: " + item.meta(),
                            in.metaMes().rotuloMes(),
                            "Acompanhar metas",
                            "/desempenho",
                            "DASHBOARD_ANALITICO"
                    )));
        }

        // 12. Divergência transparente entre expediente operacional e referência oficial da barbearia (Seg–Sáb 08:00–21:00)
        if (divergenciaExpedienteReferencia(in.todosExpedientes())) {
            adicionar(mapa, new InsightNegocio(
                    "CONFIG_EXPEDIENTE_REFERENCIA",
                    "CONFIGURACAO",
                    "INFORMATIVO",
                    12,
                    "Expediente operacional difere da referência comercial",
                    "O expediente administrativo usado para cálculos de ocupação e horários disponíveis não corresponde integralmente a Segunda a Sábado, 08:00–21:00.",
                    "O sistema preserva o expediente configurado no banco como fonte única de verdade e não o sobrescreve automaticamente.",
                    "Caso a barbearia já opere em Segunda a Sábado das 08:00 às 21:00, ajuste os expedientes administrativos da loja e dos profissionais.",
                    "Cálculos de disponibilidade, ocupação e mapa de demanda seguem o cadastro atual em /expediente.",
                    "Configuração ativa de expediente",
                    "Revisar expediente",
                    "/expediente",
                    "DISPONIBILIDADE_GERENCIAR"
            ));
        }

        // 13. Fallback honesto quando não há massa suficiente para gerar recomendações de tendência
        boolean apenasInformativoConfig = mapa.values().stream()
                .allMatch(i -> "CONFIG_EXPEDIENTE_REFERENCIA".equals(i.id()));
        if (mapa.isEmpty() || (apenasInformativoConfig && in.indicadores().totalAgendamentos() < MIN_ATENDIMENTOS_DEMANDA)) {
            adicionar(mapa, new InsightNegocio(
                    "DADOS_INSUFICIENTES",
                    "DADOS",
                    "INFORMATIVO",
                    20,
                    "Histórico ainda reduzido para recomendações estatísticas",
                    "O período selecionado possui " + in.indicadores().totalAgendamentos() + " agendamento(s) e "
                            + in.indicadores().concluidos() + " atendimento(s) concluído(s), abaixo do mínimo necessário para detectar tendências confiáveis.",
                    "Evitar recomendações com amostras pequenas protege o gestor de decisões baseadas em oscilações pontuais.",
                    "Continue registrando atendimentos concluídos e compare novamente ao atingir pelo menos 5 atendimentos no período ou ampliar o filtro para Este mês.",
                    "Mínimo configurado: >= " + MIN_ATENDIMENTOS_DEMANDA + " atendimentos para análise de demanda/perdas.",
                    in.indicadores().totalAgendamentos() + " agendamento(s) no período",
                    "Consultar agenda",
                    "/agenda?data=" + hojeIso + profQuery,
                    "AGENDAMENTOS_CONSULTAR"
            ));
        }

        return mapa.values().stream()
                .sorted(Comparator.comparingInt((InsightNegocio i) -> ordemSeveridade(i.severidade()))
                        .thenComparingInt(InsightNegocio::prioridade))
                .toList();
    }

    public ResumoNarrativo gerarResumoPeriodo(EntradaAnalise in, List<InsightNegocio> insights) {
        Indicadores ind = in.indicadores();
        String escopoProf = in.contexto().barbeiroNome() == null
                ? ""
                : " (filtrado para " + in.contexto().barbeiroNome() + ")";
        String manchete = ind.totalAgendamentos() == 0
                ? "Sem agendamentos registrados em " + in.contexto().rotuloPeriodo() + escopoProf + "."
                : ind.concluidos() + " atendimento(s) concluído(s) e R$ " + ind.valorServicosConcluidos()
                + " em valor de serviços concluídos em " + in.contexto().rotuloPeriodo() + escopoProf + ".";

        List<String> resultados = new ArrayList<>();
        resultados.add("Total de " + ind.totalAgendamentos() + " agendamento(s): "
                + ind.concluidos() + " concluído(s), "
                + (ind.confirmados() + ind.pendentes()) + " em aberto, "
                + ind.cancelados() + " cancelado(s) e " + ind.faltas() + " falta(s).");
        resultados.add("Valor dos serviços concluídos: R$ " + ind.valorServicosConcluidos()
                + (ind.valorPrevistoAgendamentos().compareTo(BigDecimal.ZERO) > 0
                ? " · Valor previsto em aberto: R$ " + ind.valorPrevistoAgendamentos() + "."
                : "."));
        if (ind.ticketMedioConcluidos() != null) {
            resultados.add("Ticket médio dos serviços concluídos pagos: R$ " + ind.ticketMedioConcluidos()
                    + " em " + ind.concluidosPagos() + " atendimento(s) pago(s).");
        }
        if (ind.ocupacaoPercentual() != null) {
            String extraDecorrida = ind.ocupacaoDecorridaPercentual() != null && in.contexto().periodoIncompleto()
                    ? " (" + ind.ocupacaoDecorridaPercentual() + "% na janela já decorrida)"
                    : "";
            resultados.add("Ocupação da agenda: " + ind.ocupacaoPercentual() + "%" + extraDecorrida
                    + " em " + formatarMinutos(ind.minutosDisponiveis()) + " de capacidade líquida.");
        }
        resultados.add("Clientes únicos atendidos: " + ind.clientesUnicosAtendidos()
                + " (" + ind.clientesRecorrentes() + " recorrente(s) com >= 2 visitas concluídas).");

        String comparacao;
        Variacao cv = ind.compValorConcluidos();
        Variacao cc = ind.compConcluidos();
        if (cc.comparavel() && cc.deltaPercentual() != null) {
            String sinal = cc.deltaPercentual().compareTo(BigDecimal.ZERO) >= 0 ? "+" : "";
            comparacao = "Frente a " + in.contexto().rotuloComparacao() + ", os atendimentos concluídos variaram "
                    + sinal + cc.deltaPercentual() + "% (" + cc.anterior().longValue() + " → " + cc.atual().longValue() + ")"
                    + (cv.comparavel() && cv.deltaPercentual() != null
                    ? " e o valor concluído variou " + (cv.deltaPercentual().compareTo(BigDecimal.ZERO) >= 0 ? "+" : "")
                    + cv.deltaPercentual() + "% (R$ " + cv.anterior() + " → R$ " + cv.atual() + ")."
                    : ".");
        } else {
            comparacao = "Não há histórico concluído suficiente em " + in.contexto().rotuloComparacao()
                    + " para calcular variação percentual válida (denominador zero).";
        }

        List<String> positivos = new ArrayList<>();
        List<String> atencao = new ArrayList<>();
        for (InsightNegocio i : insights) {
            if ("POSITIVO".equals(i.severidade())) {
                positivos.add(i.titulo() + ": " + i.oQueAconteceu());
            } else if ("ALTA".equals(i.severidade()) || "ATENCAO".equals(i.severidade())) {
                atencao.add(i.titulo() + ": " + i.oQueAconteceu());
            }
        }
        if (positivos.isEmpty() && ind.concluidos() > 0 && ind.faltas() == 0 && ind.cancelados() == 0) {
            positivos.add("Nenhum cancelamento ou falta registrado até o momento no período.");
        }

        String resumoMetas;
        if (in.metaMes() == null || !in.metaMes().configurada()) {
            resumoMetas = "Nenhuma meta mensal configurada para "
                    + (in.metaMes() != null ? in.metaMes().rotuloMes() : "o mês de referência")
                    + ". Você pode definir metas reais no bloco Metas do mês.";
        } else {
            resumoMetas = "Metas de " + in.metaMes().rotuloMes() + ": "
                    + in.metaMes().itens().stream()
                    .map(it -> it.rotulo() + " em " + it.percentualAtingido() + "% (" + it.atual() + " / " + it.meta() + ")")
                    .reduce((a, b) -> a + " · " + b).orElse("configuradas.")
                    + " · " + in.metaMes().diasOperacionaisRestantes() + " dia(s) operacional(is) restante(s).";
        }

        List<String> prioridades = insights.stream()
                .filter(i -> !"DADOS_INSUFICIENTES".equals(i.id()))
                .limit(3)
                .map(i -> i.titulo() + " — " + i.oQueFazer())
                .toList();
        if (prioridades.isEmpty()) {
            prioridades = List.of("Manter o registro regular de conclusões na agenda para consolidar a base analítica.");
        }

        return new ResumoNarrativo(manchete, resultados, comparacao, positivos, atencao, resumoMetas, prioridades);
    }

    public static boolean divergenciaExpedienteReferencia(List<Expediente> todosExpedientes) {
        List<Expediente> loja = todosExpedientes.stream()
                .filter(e -> e.barbeiro == null && e.dia != null && e.inicio != null && e.fim != null)
                .toList();
        if (loja.isEmpty()) return true;
        Set<DayOfWeek> diasAbertos = EnumSet.noneOf(DayOfWeek.class);
        for (Expediente e : loja) {
            diasAbertos.add(e.dia);
            if (!DIAS_REFERENCIA.contains(e.dia)
                    || !LocalTime.of(8, 0).equals(e.inicio)
                    || !LocalTime.of(21, 0).equals(e.fim)) {
                return true;
            }
        }
        return !diasAbertos.equals(DIAS_REFERENCIA);
    }

    private static void adicionar(Map<String, InsightNegocio> mapa, InsightNegocio item) {
        mapa.putIfAbsent(item.id(), item);
    }

    private static int ordemSeveridade(String s) {
        return switch (s) {
            case "ALTA" -> 0;
            case "ATENCAO" -> 1;
            case "POSITIVO" -> 2;
            default -> 3;
        };
    }

    private static BigDecimal percentual(long num, long den) {
        if (den <= 0) return BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        return BigDecimal.valueOf(num).multiply(CEM).divide(BigDecimal.valueOf(den), 1, RoundingMode.HALF_UP);
    }

    private static String formatarMinutos(long minutos) {
        if (minutos <= 0) return "0 min";
        long h = minutos / 60;
        long m = minutos % 60;
        if (h == 0) return m + " min";
        if (m == 0) return h + "h";
        return h + "h " + m + "min";
    }
}
