package br.ueg.trindade.braully_web2_fullstack.service;

import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.List;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.repository.AgendamentoRepository;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import br.ueg.trindade.braully_web2_fullstack.security.PermissaoSistema;

@Service
@Transactional
public class AgendaService {
    private final AgendamentoRepository agenda;
    private final InstalacaoService instalacao;
    private final CatalogoService catalogo;
    private final UsuarioService usuarios;
    private final DisponibilidadeService disponibilidade;
    private final FidelidadeService fidelidade;
    private final NotificacaoService notificacoes;

    public AgendaService(AgendamentoRepository agenda, InstalacaoService instalacao, CatalogoService catalogo,
                         UsuarioService usuarios, DisponibilidadeService disponibilidade,
                         FidelidadeService fidelidade, NotificacaoService notificacoes) {
        this.agenda = agenda;
        this.instalacao = instalacao;
        this.catalogo = catalogo;
        this.usuarios = usuarios;
        this.disponibilidade = disponibilidade;
        this.fidelidade = fidelidade;
        this.notificacoes = notificacoes;
    }

    public record Nova(@NotNull Long servicoId, Long barbeiroId, @NotNull LocalDateTime inicio, Long premioId,
                       Long clienteId) {}
    public record Reagendar(@NotNull Long barbeiroId, @NotNull LocalDateTime inicio) {}
    public record View(Long id, Long clienteId, String cliente, Long barbeiroId, String barbeiro, Long servicoId,
                       String servico, BigDecimal preco, LocalDateTime inicio, LocalDateTime fim, Status status,
                       boolean beneficio, boolean podeAlterar) {}

    @Transactional(readOnly = true)
    public List<View> listar(Authentication auth, LocalDate data, Long barbeiro) {
        return listar(auth, data, null, barbeiro);
    }

    @Transactional(readOnly = true)
    public List<View> listar(Authentication auth, LocalDate data, LocalDate ate, Long barbeiro) {
        if (!equipe(auth)) return listarCliente(Identidade.id(auth), false);
        boolean apenasConsultaCliente = data == null && ate == null && barbeiro == null
                && Identidade.tem(auth, "CLIENTE") && !Identidade.tem(auth, "BARBEIRO") && !Identidade.tem(auth, "ADMIN");
        if (apenasConsultaCliente) return listarCliente(Identidade.id(auth), false);
        LocalDate inicio = data == null ? Regra.agora().toLocalDate() : data;
        LocalDate fim = ate == null ? inicio : ate;
        if (fim.isBefore(inicio)) {
            throw Regra.invalida("A data final deve ser igual ou posterior à data inicial.");
        }
        if (ChronoUnit.DAYS.between(inicio, fim) > 31) {
            throw Regra.invalida("Consulte no máximo 31 dias por vez.");
        }
        return agenda.findByInicioGreaterThanEqualAndInicioLessThanOrderByInicioAsc(
                        inicio.atStartOfDay(), fim.plusDays(1).atStartOfDay())
                .stream()
                .filter(a -> (barbeiro == null || a.barbeiro.getId().equals(barbeiro)) && atende(a, auth))
                .map(a -> view(a, podeAlterarSemAntecedencia(a, auth), 0))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<View> proximosDaSemana() {
        var agora = Regra.agora();
        return agenda.findByInicioGreaterThanEqualAndInicioLessThanOrderByInicioAsc(agora, agora.plusDays(7))
                .stream().filter(DisponibilidadeService::pendente).limit(6).map(a -> view(a, true, 0)).toList();
    }

    @Transactional(readOnly = true)
    public List<View> listarCliente(Long clienteId, boolean equipe) {
        int antecedencia = instalacao.atual().antecedenciaMinutos;
        return agenda.findByClienteIdOrderByInicioDesc(clienteId).stream().map(a -> view(a, equipe, antecedencia)).toList();
    }

    @Transactional(readOnly = true)
    public View buscar(Long id, Authentication auth) {
        var a = autorizado(id, auth);
        return view(a, podeAlterarSemAntecedencia(a, auth), instalacao.atual().antecedenciaMinutos);
    }

    @Transactional(readOnly = true)
    public List<LocalDateTime> horariosReagendamento(Long id, Long barbeiroId, LocalDate data, Authentication auth) {
        var a = autorizado(id, auth);
        verificarPodeReagendarOuCancelar(a, auth);
        alterar(a, auth, instalacao.atual());
        var b = destino(a, barbeiroId, auth);
        return b.ativo ? disponibilidade.livres(b, data, duracao(a), id) : List.of();
    }

    public View criar(Nova e, Authentication auth) {
        var loja = instalacao.bloquear();
        boolean gerencia = Identidade.temPermissao(auth, PermissaoSistema.AGENDAMENTOS_GERENCIAR);
        boolean clientePerfil = Identidade.tem(auth, "CLIENTE");
        if (!gerencia && !clientePerfil) throw Regra.proibida();
        if (e.clienteId() != null && !gerencia) throw Regra.proibida();
        if (e.clienteId() == null && !clientePerfil) {
            if (gerencia) throw Regra.invalida("Selecione o cliente da reserva.");
            throw Regra.proibida();
        }
        Long clienteId = e.clienteId() == null ? Identidade.id(auth) : e.clienteId();
        Usuario cliente = usuarios.buscar(clienteId);
        if (!cliente.isAtivo() || cliente.getPermissoes().stream().noneMatch(p -> p.getNome().equals("CLIENTE"))) {
            throw Regra.invalida("Selecione um cliente ativo.");
        }
        var s = catalogo.servico(e.servicoId());
        if (!s.ativo) throw Regra.conflito("Esse serviço está desativado.");
        validarAgendaDoCliente(clienteId, e.inicio(), s.duracaoMinutos, null);
        var b = e.barbeiroId() == null ? disponibilidade.atribuir(e.inicio(), s.duracaoMinutos) : catalogo.barbeiro(e.barbeiroId());
        validarHorario(b, e.inicio(), s.duracaoMinutos, null);
        var a = new Agendamento();
        a.barbeiro = b;
        a.cliente = cliente;
        a.servico = s;
        a.nomeServico = s.nome;
        a.beneficio = e.premioId() != null;
        a.elegivelNaReserva = s.elegivel;
        a.preco = a.beneficio ? BigDecimal.ZERO : s.preco;
        a.inicio = e.inicio();
        a.fim = e.inicio().plusMinutes(s.duracaoMinutos);
        agenda.save(a);
        if (a.beneficio) fidelidade.vincular(e.premioId(), a);
        notificacoes.aoCriarAgendamento(a, auth);
        return view(a, gerencia, loja.antecedenciaMinutos);
    }

    public View reagendar(Long id, Reagendar e, Authentication auth) {
        var loja = instalacao.bloquear();
        var a = autorizado(id, auth);
        verificarPodeReagendarOuCancelar(a, auth);
        alterar(a, auth, loja);
        var b = destino(a, e.barbeiroId(), auth);
        int duracao = duracao(a);
        validarAgendaDoCliente(a.cliente.getId(), e.inicio(), duracao, id);
        validarHorario(b, e.inicio(), duracao, a.id);
        a.barbeiro = b;
        a.inicio = e.inicio();
        a.fim = e.inicio().plusMinutes(duracao);
        a.status = Status.RESERVADO;
        boolean acaoEquipe = podeAlterarSemAntecedencia(a, auth);
        notificacoes.aoReagendar(a, acaoEquipe);
        return view(a, acaoEquipe, loja.antecedenciaMinutos);
    }

    public View status(Long id, Status destino, Authentication auth) {
        var loja = instalacao.bloquear();
        var a = autorizado(id, auth);
        if (destino == Status.CANCELADO) {
            verificarPodeReagendarOuCancelar(a, auth);
        } else if (!podeConfirmarOuConcluir(a, auth)) {
            throw Regra.proibida();
        }
        alterar(a, auth, loja);
        switch (destino) {
            case CONFIRMADO -> {
                if (a.status != Status.RESERVADO) throw Regra.conflito("Somente uma reserva pode ser confirmada.");
            }
            case CONCLUIDO -> {
                if (a.status != Status.CONFIRMADO) throw Regra.conflito("Confirme o atendimento antes de concluir.");
                if (a.fim.isAfter(Regra.agora())) throw Regra.conflito("Aguarde o fim do horário para concluir o atendimento.");
                fidelidade.concluir(loja, a);
            }
            case FALTOU -> {
                if (a.inicio.isAfter(Regra.agora())) throw Regra.conflito("Ainda não é possível registrar a falta.");
                fidelidade.liberar(a);
            }
            case CANCELADO -> fidelidade.liberar(a);
            default -> throw Regra.conflito("Transição de status inválida.");
        }
        a.status = destino;
        boolean acaoEquipe = podeAlterarSemAntecedencia(a, auth) || podeConfirmarOuConcluir(a, auth);
        if (destino == Status.CONFIRMADO) notificacoes.aoConfirmar(a);
        else if (destino == Status.CANCELADO) notificacoes.aoCancelar(a, acaoEquipe);
        return view(a, acaoEquipe, loja.antecedenciaMinutos);
    }

    private void alterar(Agendamento a, Authentication auth, Barbearia loja) {
        if (!DisponibilidadeService.pendente(a)) throw Regra.conflito("Esse atendimento já foi encerrado.");
        if (!podeAlterarSemAntecedencia(a, auth) && !a.inicio.isAfter(Regra.agora().plusMinutes(loja.antecedenciaMinutos))) {
            throw Regra.conflito("O prazo para cancelar ou reagendar pelo site terminou.");
        }
    }

    private int duracao(Agendamento a) { return Math.toIntExact(Duration.between(a.inicio, a.fim).toMinutes()); }

    private void validarAgendaDoCliente(Long clienteId, LocalDateTime inicio, int duracao, Long ignorar) {
        var fim = inicio.plusMinutes(duracao);
        if (agenda.findByClienteIdAndInicioLessThanAndFimGreaterThan(clienteId, fim, inicio).stream()
                .anyMatch(a -> !a.id.equals(ignorar) && DisponibilidadeService.pendente(a))) {
            throw Regra.conflito("Já existe uma reserva para este cliente nesse intervalo.");
        }
    }

    private void validarHorario(Barbeiro b, LocalDateTime inicio, int duracao, Long ignorar) {
        if (!b.ativo || !disponibilidade.livres(b, inicio.toLocalDate(), duracao, ignorar).contains(inicio)) {
            throw Regra.conflito("Esse horário não está disponível. Escolha outro horário.");
        }
    }

    private Barbeiro destino(Agendamento a, Long id, Authentication auth) {
        if (!Identidade.temPermissao(auth, PermissaoSistema.AGENDAMENTOS_GERENCIAR) && !a.barbeiro.getId().equals(id)) {
            if (!ehClienteProprio(a, auth)) {
                throw Regra.proibida();
            }
        }
        return catalogo.barbeiro(id);
    }

    private Agendamento autorizado(Long id, Authentication auth) {
        var a = agenda.findById(id).orElseThrow(Regra::inexistente);
        boolean autorizado = atende(a, auth) || ehClienteProprio(a, auth);
        if (!autorizado) throw Regra.inexistente();
        return a;
    }

    private boolean temEscopoTotalAgenda(Authentication auth) {
        return Identidade.temAlgumaPermissao(auth,
                PermissaoSistema.AGENDAMENTOS_CONSULTAR,
                PermissaoSistema.AGENDAMENTOS_GERENCIAR,
                PermissaoSistema.AGENDAMENTOS_CONFIRMAR_CONCLUIR);
    }

    private boolean equipe(Authentication auth) {
        return Identidade.tem(auth, "BARBEIRO") || temEscopoTotalAgenda(auth);
    }

    private boolean ehProprioBarbeiro(Agendamento a, Authentication auth) {
        var conta = a.barbeiro.getUsuario();
        return Identidade.tem(auth, "BARBEIRO") && conta != null && conta.getId().equals(Identidade.id(auth));
    }

    private boolean ehClienteProprio(Agendamento a, Authentication auth) {
        return Identidade.tem(auth, "CLIENTE") && a.cliente.getId().equals(Identidade.id(auth));
    }

    private boolean atende(Agendamento a, Authentication auth) {
        return temEscopoTotalAgenda(auth) || ehProprioBarbeiro(a, auth);
    }

    private boolean podeConfirmarOuConcluir(Agendamento a, Authentication auth) {
        return Identidade.temPermissao(auth, PermissaoSistema.AGENDAMENTOS_CONFIRMAR_CONCLUIR) || ehProprioBarbeiro(a, auth);
    }

    private boolean podeAlterarSemAntecedencia(Agendamento a, Authentication auth) {
        return Identidade.temPermissao(auth, PermissaoSistema.AGENDAMENTOS_GERENCIAR) || ehProprioBarbeiro(a, auth);
    }

    private void verificarPodeReagendarOuCancelar(Agendamento a, Authentication auth) {
        boolean permitido = Identidade.temPermissao(auth, PermissaoSistema.AGENDAMENTOS_GERENCIAR)
                || ehProprioBarbeiro(a, auth)
                || ehClienteProprio(a, auth);
        if (!permitido) throw Regra.proibida();
    }

    private View view(Agendamento a, boolean equipe, int antecedencia) {
        boolean alterar = DisponibilidadeService.pendente(a)
                && (equipe || a.inicio.isAfter(Regra.agora().plusMinutes(antecedencia)));
        return new View(a.id, a.cliente.getId(), a.cliente.getNome(), a.barbeiro.getId(), a.barbeiro.getNome(),
                a.servico.getId(), a.nomeServico, a.preco, a.inicio, a.fim, a.status, a.beneficio, alterar);
    }
}
