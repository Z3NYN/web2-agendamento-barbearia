package br.ueg.trindade.braully_web2_fullstack.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade;

public interface MovimentoFidelidadeRepository extends JpaRepository<MovimentoFidelidade, Long> {
    List<MovimentoFidelidade> findByClienteIdOrderByIdDesc(Long clienteId);
    boolean existsByPremioIdAndResgatadoEmIsNull(Long premioId);
    boolean existsByAgendamentoIdAndTipo(Long agendamentoId, MovimentoFidelidade.Tipo tipo);
    Optional<MovimentoFidelidade> findByAgendamentoIdAndTipo(Long agendamentoId, MovimentoFidelidade.Tipo tipo);

    @Query("select count(distinct m.cliente.id) from MovimentoFidelidade m")
    long contarParticipantesDistintos();

    @Query("select count(distinct m.cliente.id) from MovimentoFidelidade m "
            + "where m.tipo = br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade$Tipo.RECOMPENSA "
            + "and m.resgatadoEm is null")
    long contarClientesComRecompensaDisponivel();

    @Query("select count(m) from MovimentoFidelidade m "
            + "where m.tipo = :tipo and m.criadoEm >= :inicio and m.criadoEm < :fim")
    long contarPorTipoNoPeriodo(@Param("tipo") MovimentoFidelidade.Tipo tipo,
                                @Param("inicio") LocalDateTime inicio,
                                @Param("fim") LocalDateTime fim);

    @Query("select count(m) from MovimentoFidelidade m "
            + "where m.tipo = br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade$Tipo.RECOMPENSA "
            + "and m.resgatadoEm >= :inicio and m.resgatadoEm < :fim")
    long contarRecompensasResgatadasNoPeriodo(@Param("inicio") LocalDateTime inicio,
                                              @Param("fim") LocalDateTime fim);

    @Query("select m.cliente.id, count(m) from MovimentoFidelidade m "
            + "where m.tipo = br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade$Tipo.RECOMPENSA "
            + "and m.resgatadoEm is null and m.agendamento is null group by m.cliente.id")
    List<Object[]> contarRecompensasLivresPorCliente();

    @Query("select m.cliente.id, sum(case when m.tipo = br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade$Tipo.CREDITO "
            + "then m.quantidade else -m.quantidade end) from MovimentoFidelidade m group by m.cliente.id")
    List<Object[]> saldosPorCliente();
}
