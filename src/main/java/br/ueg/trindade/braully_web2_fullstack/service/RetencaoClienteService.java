package br.ueg.trindade.braully_web2_fullstack.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.model.Usuario;
import br.ueg.trindade.braully_web2_fullstack.repository.AgendamentoRepository;
import br.ueg.trindade.braully_web2_fullstack.repository.MovimentoFidelidadeRepository;
import br.ueg.trindade.braully_web2_fullstack.repository.UsuarioRepository;

@Service
@Transactional(readOnly = true)
public class RetencaoClienteService {

    public enum StatusRetencao {
        RETORNO_ATRASADO,
        AGENDAMENTO_FUTURO,
        RETORNO_ESPERADO,
        CLIENTE_RECORRENTE,
        CLIENTE_NOVO,
        HISTORICO_INSUFICIENTE
    }

    public enum Ordenacao { ATRASO, ULTIMO_ATENDIMENTO, VALOR, VISITAS, NOME }

    public record ClienteRetencao(
            Long id,
            String nome,
            String username,
            String email,
            boolean ativo,
            StatusRetencao statusRetencao,
            String rotuloStatus,
            String explicacaoStatus,
            LocalDateTime ultimoAtendimento,
            Integer diasDesdeUltimo,
            long totalConcluidos,
            Integer intervaloHabitualDias,
            Integer limiteEsperaDias,
            String servicoMaisFrequente,
            String profissionalMaisFrequente,
            BigDecimal valorTotalConcluidos,
            Integer recompensasDisponiveis,
            LocalDateTime proximoAgendamento
    ) {}

    public record ContadoresRetencao(
            long totalClientes,
            long atrasados,
            long agendamentoFuturo,
            long retornoEsperado,
            long recorrentes,
            long novos,
            long historicoInsuficiente
    ) {}

    public record PainelRetencao(ContadoresRetencao resumo, List<ClienteRetencao> clientes) {}

    private final AgendamentoRepository agenda;
    private final UsuarioRepository usuarios;
    private final MovimentoFidelidadeRepository movimentos;

    public RetencaoClienteService(AgendamentoRepository agenda, UsuarioRepository usuarios,
                                  MovimentoFidelidadeRepository movimentos) {
        this.agenda = agenda;
        this.usuarios = usuarios;
        this.movimentos = movimentos;
    }

    public PainelRetencao listar(String busca, StatusRetencao filtroStatus, Ordenacao ordenar, boolean incluirFidelidade) {
        LocalDateTime agora = Regra.agora();
        List<Usuario> clientes = usuarios.findTodosClientes();
        List<Agendamento> historico = agenda.findDetalhadosPorStatuses(
                List.of(Status.CONCLUIDO, Status.RESERVADO, Status.CONFIRMADO));
        Map<Long, List<Agendamento>> porCliente = historico.stream()
                .collect(Collectors.groupingBy(a -> a.cliente.getId()));
        Map<Long, Integer> recompensasMap = incluirFidelidade ? carregarRecompensasDisponiveis() : Map.of();

        List<ClienteRetencao> todos = clientes.stream()
                .map(u -> classificar(u, porCliente.getOrDefault(u.getId(), List.of()),
                        agora, incluirFidelidade ? recompensasMap.getOrDefault(u.getId(), 0) : null))
                .toList();

        ContadoresRetencao resumo = resumirContadores(todos);

        String termo = normalizar(busca);
        Ordenacao ord = ordenar == null ? Ordenacao.ATRASO : ordenar;
        List<ClienteRetencao> filtrados = todos.stream()
                .filter(c -> filtroStatus == null || c.statusRetencao() == filtroStatus)
                .filter(c -> termo.isEmpty() || normalizar(c.nome() + " " + c.username() + " " + c.email()).contains(termo))
                .sorted(comparador(ord))
                .toList();

        return new PainelRetencao(resumo, filtrados);
    }

    public ClienteRetencao buscarCliente(Long clienteId, boolean incluirFidelidade) {
        Usuario u = usuarios.findWithPermissoesById(clienteId).orElseThrow(Regra::inexistente);
        if (u.getPermissoes().stream().noneMatch(p -> "CLIENTE".equals(p.getNome()))) {
            throw Regra.inexistente();
        }
        LocalDateTime agora = Regra.agora();
        List<Agendamento> lista = agenda.findByClienteIdOrderByInicioDesc(clienteId).stream()
                .filter(a -> a.status == Status.CONCLUIDO || a.status == Status.RESERVADO || a.status == Status.CONFIRMADO)
                .sorted(Comparator.comparing(a -> a.inicio))
                .toList();
        Integer recompensas = incluirFidelidade
                ? carregarRecompensasDisponiveis().getOrDefault(clienteId, 0)
                : null;
        return classificar(u, lista, agora, recompensas);
    }

    public ContadoresRetencao contarResumoAgregado() {
        LocalDateTime agora = Regra.agora();
        List<Usuario> clientes = usuarios.findTodosClientes();
        List<Agendamento> historico = agenda.findDetalhadosPorStatuses(
                List.of(Status.CONCLUIDO, Status.RESERVADO, Status.CONFIRMADO));
        Map<Long, List<Agendamento>> porCliente = historico.stream()
                .collect(Collectors.groupingBy(a -> a.cliente.getId()));
        List<ClienteRetencao> todos = clientes.stream()
                .map(u -> classificar(u, porCliente.getOrDefault(u.getId(), List.of()), agora, null))
                .toList();
        return resumirContadores(todos);
    }

    private ClienteRetencao classificar(Usuario u, List<Agendamento> registros, LocalDateTime agora, Integer recompensas) {
        LocalDate hoje = agora.toLocalDate();
        List<Agendamento> concluidos = registros.stream()
                .filter(a -> a.status == Status.CONCLUIDO)
                .sorted(Comparator.comparing(a -> a.inicio))
                .toList();

        LocalDateTime proximo = registros.stream()
                .filter(a -> DisponibilidadeService.pendente(a) && a.fim.isAfter(agora))
                .map(a -> a.inicio)
                .min(LocalDateTime::compareTo)
                .orElse(null);

        long totalConcluidos = concluidos.size();
        LocalDateTime ultimo = totalConcluidos > 0 ? concluidos.getLast().inicio : null;
        Integer diasDesdeUltimo = ultimo != null
                ? Math.max(0, (int) ChronoUnit.DAYS.between(ultimo.toLocalDate(), hoje))
                : null;

        BigDecimal valorTotal = concluidos.stream()
                .map(a -> a.preco == null ? BigDecimal.ZERO : a.preco)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        String servicoFreq = maisFrequente(concluidos.stream()
                .map(a -> {
                    String cat = a.servico.getNome();
                    return (cat != null && !cat.isBlank()) ? cat : a.nomeServico;
                })
                .toList());
        String profFreq = maisFrequente(concluidos.stream()
                .map(a -> a.barbeiro.getNome())
                .toList());

        List<Integer> intervalosPositivos = new ArrayList<>();
        for (int i = 1; i < concluidos.size(); i++) {
            long dias = ChronoUnit.DAYS.between(
                    concluidos.get(i - 1).inicio.toLocalDate(),
                    concluidos.get(i).inicio.toLocalDate());
            if (dias > 0) {
                intervalosPositivos.add((int) dias);
            }
        }

        Integer intervaloHabitual = null;
        Integer limiteEspera = null;
        if (intervalosPositivos.size() >= 2) {
            intervaloHabitual = mediana(intervalosPositivos);
            limiteEspera = Math.max(intervaloHabitual + 7, (int) Math.round(intervaloHabitual * 1.35));
        } else if (intervalosPositivos.size() == 1) {
            intervaloHabitual = intervalosPositivos.getFirst();
        }

        StatusRetencao status;
        String rotulo;
        String explicacao;

        if (proximo != null) {
            status = StatusRetencao.AGENDAMENTO_FUTURO;
            rotulo = "Agendamento futuro";
            explicacao = "Possui horário marcado em aberto (" + totalConcluidos + " atendimento(s) concluído(s)).";
        } else if (totalConcluidos == 0) {
            status = StatusRetencao.HISTORICO_INSUFICIENTE;
            rotulo = "Histórico insuficiente";
            explicacao = "Nenhum atendimento concluído registrado para estimar frequência.";
        } else if (totalConcluidos == 1) {
            status = StatusRetencao.CLIENTE_NOVO;
            rotulo = "Cliente novo";
            explicacao = "Primeiro atendimento concluído há " + diasDesdeUltimo + " dia(s); aguardando segunda visita.";
        } else if (totalConcluidos == 2) {
            status = StatusRetencao.CLIENTE_RECORRENTE;
            rotulo = "Cliente recorrente";
            explicacao = intervalosPositivos.size() == 1
                    ? "2 visitas concluídas (intervalo observado de " + intervalosPositivos.getFirst() + " dia(s); requer 3+ para estimativa individual)."
                    : "2 visitas concluídas no mesmo dia; histórico insuficiente para estimar intervalo.";
        } else if (limiteEspera == null) {
            status = StatusRetencao.HISTORICO_INSUFICIENTE;
            rotulo = "Histórico insuficiente";
            explicacao = "Visitas concentradas na mesma data; são necessários ao menos 2 intervalos em dias distintos.";
        } else if (diasDesdeUltimo > limiteEspera) {
            status = StatusRetencao.RETORNO_ATRASADO;
            rotulo = "Retorno acima do habitual";
            explicacao = "Última visita há " + diasDesdeUltimo + " dias; mediana habitual de "
                    + intervaloHabitual + " dias (tolerância até " + limiteEspera + " dias).";
        } else {
            status = StatusRetencao.RETORNO_ESPERADO;
            rotulo = "Retorno esperado";
            explicacao = "Última visita há " + diasDesdeUltimo + " dias, dentro da faixa habitual (mediana "
                    + intervaloHabitual + " dias, limite " + limiteEspera + " dias).";
        }

        return new ClienteRetencao(
                u.getId(), u.getNome(), u.getUsername(), u.getEmail(), u.isAtivo(),
                status, rotulo, explicacao, ultimo, diasDesdeUltimo, totalConcluidos,
                intervaloHabitual, limiteEspera, servicoFreq, profFreq, valorTotal,
                recompensas, proximo
        );
    }

    private Map<Long, Integer> carregarRecompensasDisponiveis() {
        Map<Long, Integer> map = new HashMap<>();
        for (Object[] linha : movimentos.contarRecompensasLivresPorCliente()) {
            Long cid = (Long) linha[0];
            Long qtd = (Long) linha[1];
            map.put(cid, qtd.intValue());
        }
        return map;
    }

    private static ContadoresRetencao resumirContadores(List<ClienteRetencao> todos) {
        long atrasados = todos.stream().filter(c -> c.statusRetencao() == StatusRetencao.RETORNO_ATRASADO).count();
        long futuro = todos.stream().filter(c -> c.statusRetencao() == StatusRetencao.AGENDAMENTO_FUTURO).count();
        long esperado = todos.stream().filter(c -> c.statusRetencao() == StatusRetencao.RETORNO_ESPERADO).count();
        long recorrente = todos.stream().filter(c -> c.statusRetencao() == StatusRetencao.CLIENTE_RECORRENTE).count();
        long novo = todos.stream().filter(c -> c.statusRetencao() == StatusRetencao.CLIENTE_NOVO).count();
        long insuf = todos.stream().filter(c -> c.statusRetencao() == StatusRetencao.HISTORICO_INSUFICIENTE).count();
        return new ContadoresRetencao(todos.size(), atrasados, futuro, esperado, recorrente, novo, insuf);
    }

    private static Comparator<ClienteRetencao> comparador(Ordenacao ord) {
        return switch (ord) {
            case ATRASO -> Comparator
                    .comparingInt((ClienteRetencao c) -> prioridadeOrdenacao(c.statusRetencao()))
                    .thenComparing((ClienteRetencao c) -> c.diasDesdeUltimo() == null ? -1 : c.diasDesdeUltimo(), Comparator.reverseOrder())
                    .thenComparing(ClienteRetencao::nome, String.CASE_INSENSITIVE_ORDER);
            case ULTIMO_ATENDIMENTO -> Comparator
                    .comparing(ClienteRetencao::ultimoAtendimento, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(ClienteRetencao::nome, String.CASE_INSENSITIVE_ORDER);
            case VALOR -> Comparator
                    .comparing(ClienteRetencao::valorTotalConcluidos, Comparator.reverseOrder())
                    .thenComparing(ClienteRetencao::nome, String.CASE_INSENSITIVE_ORDER);
            case VISITAS -> Comparator
                    .comparingLong(ClienteRetencao::totalConcluidos).reversed()
                    .thenComparing(ClienteRetencao::nome, String.CASE_INSENSITIVE_ORDER);
            case NOME -> Comparator.comparing(ClienteRetencao::nome, String.CASE_INSENSITIVE_ORDER);
        };
    }

    private static int prioridadeOrdenacao(StatusRetencao status) {
        return switch (status) {
            case RETORNO_ATRASADO -> 0;
            case RETORNO_ESPERADO -> 1;
            case CLIENTE_RECORRENTE -> 2;
            case CLIENTE_NOVO -> 3;
            case AGENDAMENTO_FUTURO -> 4;
            case HISTORICO_INSUFICIENTE -> 5;
        };
    }

    private static int mediana(List<Integer> valores) {
        List<Integer> ord = valores.stream().sorted().toList();
        int n = ord.size();
        if (n % 2 == 1) return ord.get(n / 2);
        return (int) Math.round((ord.get(n / 2 - 1) + ord.get(n / 2)) / 2.0);
    }

    private static String maisFrequente(List<String> itens) {
        if (itens.isEmpty()) return null;
        return itens.stream()
                .filter(Objects::nonNull)
                .filter(s -> !s.isBlank())
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.<String, Long>comparingByValue().thenComparing(Map.Entry::getKey, Comparator.reverseOrder()))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private static final java.util.regex.Pattern DIACRITICOS = java.util.regex.Pattern.compile("\\p{M}+");

    private static String normalizar(String s) {
        if (s == null) return "";
        return DIACRITICOS.matcher(java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD))
                .replaceAll("")
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
