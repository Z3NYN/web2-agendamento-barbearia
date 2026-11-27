package br.ueg.trindade.braully_web2_fullstack.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.repository.*;

@Service
@Transactional
public class MetaService {

    private static final DateTimeFormatter MES_FMT = DateTimeFormatter.ofPattern("MMMM/yyyy", Locale.forLanguageTag("pt-BR"));
    private static final BigDecimal CEM = new BigDecimal("100");

    public record EntradaMeta(
            @Min(1) Integer metaAtendimentosConcluidos,
            @DecimalMin("0.01") BigDecimal metaValorConcluidos,
            @Min(1) Integer metaClientesUnicos,
            @Min(1) Integer metaNovosCadastros,
            @DecimalMin("0.1") @DecimalMax("100.0") BigDecimal metaOcupacaoPercentual
    ) {}

    public record ItemProgressoMeta(
            String codigo,
            String rotulo,
            String unidade,
            BigDecimal atual,
            BigDecimal meta,
            BigDecimal percentualAtingido,
            BigDecimal restante,
            BigDecimal mediaDiariaNecessaria,
            boolean atingida,
            String observacao
    ) {}

    public record ResumoMetaMensal(
            int ano,
            int mes,
            String rotuloMes,
            boolean configurada,
            String statusMes,
            int diasOperacionaisTotais,
            int diasOperacionaisDecorridos,
            int diasOperacionaisRestantes,
            LocalDateTime atualizadaEm,
            List<ItemProgressoMeta> itens
    ) {}

    private final MetaMensalRepository metas;
    private final AgendamentoRepository agenda;
    private final BarbeiroRepository barbeiros;
    private final ExpedienteRepository expedientes;
    private final BloqueioRepository bloqueios;
    private final UsuarioRepository usuarios;

    public MetaService(MetaMensalRepository metas, AgendamentoRepository agenda,
                       BarbeiroRepository barbeiros, ExpedienteRepository expedientes,
                       BloqueioRepository bloqueios, UsuarioRepository usuarios) {
        this.metas = metas;
        this.agenda = agenda;
        this.barbeiros = barbeiros;
        this.expedientes = expedientes;
        this.bloqueios = bloqueios;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public List<ResumoMetaMensal> listarHistorico() {
        LocalDateTime agora = Regra.agora();
        return metas.findAllByOrderByAnoDescMesDesc().stream()
                .map(m -> calcularProgresso(m, agora))
                .toList();
    }

    @Transactional(readOnly = true)
    public ResumoMetaMensal buscarMes(int ano, int mes) {
        validarAnoMes(ano, mes);
        LocalDateTime agora = Regra.agora();
        return metas.findByAnoAndMes(ano, mes)
                .map(m -> calcularProgresso(m, agora))
                .orElseGet(() -> mesSemMeta(ano, mes, agora));
    }

    public ResumoMetaMensal salvarMes(int ano, int mes, EntradaMeta e) {
        validarAnoMes(ano, mes);
        if (e.metaAtendimentosConcluidos() == null
                && e.metaValorConcluidos() == null
                && e.metaClientesUnicos() == null
                && e.metaNovosCadastros() == null
                && e.metaOcupacaoPercentual() == null) {
            throw Regra.invalida("Defina pelo menos uma meta mensal com valor positivo.");
        }
        LocalDateTime agora = Regra.agora();
        MetaMensal m = metas.findByAnoAndMes(ano, mes).orElseGet(() -> {
            MetaMensal nova = new MetaMensal();
            nova.setAno(ano);
            nova.setMes(mes);
            nova.setCriadaEm(agora);
            return nova;
        });
        m.setMetaAtendimentosConcluidos(e.metaAtendimentosConcluidos());
        m.setMetaValorConcluidos(e.metaValorConcluidos() == null
                ? null
                : e.metaValorConcluidos().setScale(2, RoundingMode.HALF_UP));
        m.setMetaClientesUnicos(e.metaClientesUnicos());
        m.setMetaNovosCadastros(e.metaNovosCadastros());
        m.setMetaOcupacaoPercentual(e.metaOcupacaoPercentual() == null
                ? null
                : e.metaOcupacaoPercentual().setScale(1, RoundingMode.HALF_UP));
        m.setAtualizadaEm(agora);
        metas.saveAndFlush(m);
        return calcularProgresso(m, agora);
    }

    public void removerMes(int ano, int mes) {
        validarAnoMes(ano, mes);
        MetaMensal m = metas.findByAnoAndMes(ano, mes).orElseThrow(Regra::inexistente);
        metas.delete(m);
    }

    private ResumoMetaMensal mesSemMeta(int ano, int mes, LocalDateTime agora) {
        YearMonth ym = YearMonth.of(ano, mes);
        List<Barbeiro> ativos = barbeiros.findAllByOrderByNomeAsc().stream().filter(b -> b.ativo).toList();
        List<Expediente> exps = expedientes.findAllComBarbeiro();
        List<Bloqueio> bloqs = bloqueios.findComBarbeiroNoIntervalo(
                ym.atEndOfMonth().plusDays(1).atStartOfDay(), ym.atDay(1).atStartOfDay());
        PainelService.CalendarioMes cal = PainelService.calendarioOperacionalMes(ym, agora, ativos, exps, bloqs);
        return new ResumoMetaMensal(
                ano, mes, rotuloMes(ym), false, statusMes(ym, agora.toLocalDate()),
                cal.diasTotais(), cal.diasDecorridos(), cal.diasRestantes(), null, List.of()
        );
    }

    private ResumoMetaMensal calcularProgresso(MetaMensal m, LocalDateTime agora) {
        YearMonth ym = YearMonth.of(m.getAno(), m.getMes());
        LocalDate ini = ym.atDay(1);
        LocalDate fim = ym.atEndOfMonth();
        LocalDate hoje = agora.toLocalDate();

        List<Agendamento> ags = agenda.findDetalhadosNoPeriodo(ini.atStartOfDay(), fim.plusDays(1).atStartOfDay());
        List<Barbeiro> ativos = barbeiros.findAllByOrderByNomeAsc().stream().filter(b -> b.ativo).toList();
        List<Expediente> exps = expedientes.findAllComBarbeiro();
        List<Bloqueio> bloqs = bloqueios.findComBarbeiroNoIntervalo(fim.plusDays(1).atStartOfDay(), ini.atStartOfDay());

        PainelService.CalendarioMes cal = PainelService.calendarioOperacionalMes(ym, agora, ativos, exps, bloqs);
        String stMes = statusMes(ym, hoje);
        int restantes = cal.diasRestantes();

        long concluidos = ags.stream().filter(a -> a.status == Status.CONCLUIDO).count();
        BigDecimal valorConcluidos = ags.stream()
                .filter(a -> a.status == Status.CONCLUIDO && a.preco != null)
                .map(a -> a.preco)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        long clientesUnicos = ags.stream()
                .filter(a -> a.status == Status.CONCLUIDO)
                .map(a -> a.cliente.getId())
                .distinct()
                .count();
        long novosCadastros = usuarios.contarClientesCriadosNoPeriodo(ini.atStartOfDay(), fim.plusDays(1).atStartOfDay());

        Set<Long> comAgenda = ags.stream().map(a -> a.barbeiro.getId()).collect(java.util.stream.Collectors.toSet());
        List<Barbeiro> escopo = barbeiros.findAllByOrderByNomeAsc().stream()
                .filter(b -> b.ativo || comAgenda.contains(b.getId()))
                .toList();
        PainelService.CapacidadePeriodo cap = PainelService.calcularCapacidadePublico(ini, fim, escopo, exps, bloqs);
        long minutosOcupados = PainelService.minutosOcupadosUnificados(ags);
        BigDecimal ocupacao = cap.minutosDisponiveis() > 0
                ? BigDecimal.valueOf(minutosOcupados).multiply(CEM)
                        .divide(BigDecimal.valueOf(cap.minutosDisponiveis()), 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);

        List<ItemProgressoMeta> itens = new ArrayList<>();
        if (m.getMetaAtendimentosConcluidos() != null) {
            itens.add(itemContagem("ATENDIMENTOS", "Atendimentos concluídos", "atend.",
                    BigDecimal.valueOf(concluidos), BigDecimal.valueOf(m.getMetaAtendimentosConcluidos()),
                    0, restantes, stMes));
        }
        if (m.getMetaValorConcluidos() != null) {
            itens.add(itemContagem("VALOR_CONCLUIDO", "Valor dos serviços concluídos", "BRL",
                    valorConcluidos, m.getMetaValorConcluidos(), 2, restantes, stMes));
        }
        if (m.getMetaClientesUnicos() != null) {
            itens.add(itemContagem("CLIENTES_UNICOS", "Clientes únicos atendidos", "clientes",
                    BigDecimal.valueOf(clientesUnicos), BigDecimal.valueOf(m.getMetaClientesUnicos()),
                    0, restantes, stMes));
        }
        if (m.getMetaNovosCadastros() != null) {
            itens.add(itemContagem("NOVOS_CADASTROS", "Novos cadastros de clientes", "cadastros",
                    BigDecimal.valueOf(novosCadastros), BigDecimal.valueOf(m.getMetaNovosCadastros()),
                    0, restantes, stMes));
        }
        if (m.getMetaOcupacaoPercentual() != null) {
            BigDecimal metaOc = m.getMetaOcupacaoPercentual().setScale(1, RoundingMode.HALF_UP);
            BigDecimal pct = metaOc.compareTo(BigDecimal.ZERO) > 0
                    ? ocupacao.multiply(CEM).divide(metaOc, 1, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
            boolean atingida = ocupacao.compareTo(metaOc) >= 0;
            BigDecimal restante = atingida ? BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP) : metaOc.subtract(ocupacao).setScale(1, RoundingMode.HALF_UP);
            String obs = cap.minutosDisponiveis() == 0
                    ? "Sem minutos disponíveis configurados para o mês."
                    : atingida
                    ? "Meta de ocupação alcançada no mês."
                    : "Diferença de " + restante + " p.p. sobre a capacidade total mensal.";
            itens.add(new ItemProgressoMeta("OCUPACAO", "Ocupação da agenda", "PCT",
                    ocupacao, metaOc, pct, restante, null, atingida, obs));
        }

        return new ResumoMetaMensal(
                m.getAno(), m.getMes(), rotuloMes(ym), true, stMes,
                cal.diasTotais(), cal.diasDecorridos(), restantes, m.getAtualizadaEm(), itens
        );
    }

    private static ItemProgressoMeta itemContagem(String codigo, String rotulo, String unidade,
                                                  BigDecimal atual, BigDecimal meta, int escala,
                                                  int diasRestantes, String statusMes) {
        BigDecimal pct = meta.compareTo(BigDecimal.ZERO) > 0
                ? atual.multiply(CEM).divide(meta, 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(1, RoundingMode.HALF_UP);
        boolean atingida = atual.compareTo(meta) >= 0;
        BigDecimal restante = atingida
                ? BigDecimal.ZERO.setScale(escala, RoundingMode.HALF_UP)
                : meta.subtract(atual).setScale(escala, RoundingMode.HALF_UP);
        BigDecimal mediaNecessaria = (!atingida && !"ENCERRADO".equals(statusMes) && diasRestantes > 0)
                ? restante.divide(BigDecimal.valueOf(diasRestantes), Math.max(1, escala), RoundingMode.HALF_UP)
                : null;
        String obs = atingida
                ? "Meta atingida (" + pct + "%)."
                : "ENCERRADO".equals(statusMes)
                ? "Mês encerrado abaixo da meta configurada."
                : diasRestantes == 0
                ? "Sem dias operacionais restantes com expediente aberto."
                : "Ritmo sugerido em " + diasRestantes + " dia(s) operacional(is) restante(s).";
        return new ItemProgressoMeta(codigo, rotulo, unidade, atual.setScale(escala, RoundingMode.HALF_UP),
                meta.setScale(escala, RoundingMode.HALF_UP), pct, restante, mediaNecessaria, atingida, obs);
    }

    private static void validarAnoMes(int ano, int mes) {
        if (ano < 2020 || ano > 2100 || mes < 1 || mes > 12) {
            throw Regra.invalida("Informe um ano e mês válidos.");
        }
    }

    private static String statusMes(YearMonth ym, LocalDate hoje) {
        YearMonth atual = YearMonth.from(hoje);
        if (ym.isBefore(atual)) return "ENCERRADO";
        if (ym.isAfter(atual)) return "FUTURO";
        return "EM_ANDAMENTO";
    }

    private static String rotuloMes(YearMonth ym) {
        String s = MES_FMT.format(ym.atDay(1));
        return s.substring(0, 1).toUpperCase(Locale.forLanguageTag("pt-BR")) + s.substring(1);
    }
}
