package br.ueg.trindade.braully_web2_fullstack.service;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade.Tipo;
import br.ueg.trindade.braully_web2_fullstack.repository.MovimentoFidelidadeRepository;

@Service
@Transactional
public class FidelidadeService {
    private final MovimentoFidelidadeRepository movimentos;
    private final InstalacaoService instalacao;
    private final NotificacaoService notificacoes;

    public FidelidadeService(MovimentoFidelidadeRepository movimentos, InstalacaoService instalacao,
                             NotificacaoService notificacoes) {
        this.movimentos = movimentos;
        this.instalacao = instalacao;
        this.notificacoes = notificacoes;
    }

    public record Movimento(Long id, Tipo tipo, int quantidade, String premio, Long servicoId,
                            LocalDateTime criadoEm, LocalDateTime resgatadoEm, Long agendamentoId) {}
    public record Cartao(boolean ativo, int progresso, int meta, String proximoPremio, List<Movimento> historico) {}

    @Transactional(readOnly = true)
    public Cartao cartao(Long clienteId) {
        Barbearia b = instalacao.atual();
        var lista = movimentos.findByClienteIdOrderByIdDesc(clienteId);
        return new Cartao(b.fidelidadeAtiva, saldo(lista), b.meta, b.premio == null ? null : b.premio.getNome(),
                lista.stream().map(m -> new Movimento(m.id, m.tipo, m.quantidade, m.nomePremio,
                        m.premio == null ? null : m.premio.getId(), m.criadoEm, m.resgatadoEm,
                        m.agendamento == null ? null : m.agendamento.getId())).toList());
    }

    private int saldo(List<MovimentoFidelidade> lista) {
        return lista.stream().mapToInt(m -> m.tipo == Tipo.CREDITO ? m.quantidade : -m.quantidade).sum();
    }

    // Chamado na transação da agenda, com a linha da instalação bloqueada.
    public void concluir(Barbearia b, Agendamento a) {
        concluir(b, a, Regra.agora());
    }

    public void concluir(Barbearia b, Agendamento a, LocalDateTime momento) {
        if (a.beneficio) {
            var premio = movimentos.findByAgendamentoIdAndTipo(a.id, Tipo.RECOMPENSA)
                    .orElseThrow(() -> Regra.conflito("O benefício não está vinculado à reserva."));
            premio.resgatadoEm = momento;
            return;
        }
        if (!b.fidelidadeAtiva || !a.elegivelNaReserva || movimentos.existsByAgendamentoIdAndTipo(a.id, Tipo.CREDITO)) {
            return;
        }
        var credito = novo(a.cliente, Tipo.CREDITO, 1, momento);
        credito.agendamento = a;
        movimentos.save(credito);
        int saldo = saldo(movimentos.findByClienteIdOrderByIdDesc(a.cliente.getId()));
        while (saldo >= b.meta) {
            var premio = novo(a.cliente, Tipo.RECOMPENSA, b.meta, momento);
            premio.premio = b.premio;
            premio.nomePremio = b.premio.getNome();
            movimentos.save(premio);
            notificacoes.aoLiberarRecompensa(a.cliente, premio);
            saldo -= b.meta;
        }
    }

    public void vincular(Long premioId, Agendamento a) {
        var m = movimentos.findById(premioId).orElseThrow(Regra::inexistente);
        if (m.tipo != Tipo.RECOMPENSA || !m.cliente.getId().equals(a.cliente.getId())) throw Regra.proibida();
        if (m.resgatadoEm != null || m.agendamento != null || !m.premio.getId().equals(a.servico.getId())) {
            throw Regra.conflito("O benefício já foi reservado, utilizado ou pertence a outro serviço.");
        }
        m.agendamento = a;
    }

    public void liberar(Agendamento a) {
        if (!a.beneficio) return;
        movimentos.findByAgendamentoIdAndTipo(a.id, Tipo.RECOMPENSA).ifPresent(m -> m.agendamento = null);
    }

    private MovimentoFidelidade novo(Usuario u, Tipo tipo, int quantidade, LocalDateTime momento) {
        var m = new MovimentoFidelidade();
        m.cliente = u;
        m.tipo = tipo;
        m.quantidade = quantidade;
        m.criadoEm = momento;
        return m;
    }
}
