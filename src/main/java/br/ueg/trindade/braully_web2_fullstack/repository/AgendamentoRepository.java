package br.ueg.trindade.braully_web2_fullstack.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    List<Agendamento> findByInicioGreaterThanEqualAndInicioLessThanOrderByInicioAsc(LocalDateTime inicio, LocalDateTime fim);

    @EntityGraph(attributePaths = {"cliente", "barbeiro", "servico"})
    @Query("select a from Agendamento a where a.inicio >= :inicio and a.inicio < :fim order by a.inicio asc")
    List<Agendamento> findDetalhadosNoPeriodo(@Param("inicio") LocalDateTime inicio, @Param("fim") LocalDateTime fim);

    @EntityGraph(attributePaths = {"cliente", "barbeiro", "servico"})
    @Query("select a from Agendamento a where a.status in :statuses order by a.inicio asc")
    List<Agendamento> findDetalhadosPorStatuses(@Param("statuses") Collection<Agendamento.Status> statuses);

    @Query("select a.cliente.id, min(a.inicio), count(a) from Agendamento a "
            + "where a.status = :status and a.inicio < :ate group by a.cliente.id")
    List<Object[]> resumirHistoricoClientes(@Param("status") Agendamento.Status status, @Param("ate") LocalDateTime ate);

    List<Agendamento> findByClienteIdAndInicioLessThanAndFimGreaterThan(Long clienteId, LocalDateTime fim, LocalDateTime inicio);
    List<Agendamento> findByClienteIdOrderByInicioDesc(Long clienteId);
    List<Agendamento> findByBarbeiroIdAndInicioLessThanAndFimGreaterThan(Long barbeiroId, LocalDateTime fim, LocalDateTime inicio);
    List<Agendamento> findByInicioLessThanAndFimGreaterThan(LocalDateTime fim, LocalDateTime inicio);
    @EntityGraph(attributePaths = {"cliente", "barbeiro"})
    List<Agendamento> findByStatusInAndInicioGreaterThanAndInicioLessThanEqual(Collection<Agendamento.Status> status, LocalDateTime de, LocalDateTime ate);
    @EntityGraph(attributePaths = {"cliente", "barbeiro"})
    List<Agendamento> findByClienteIdAndStatusInAndInicioGreaterThanAndInicioLessThanEqual(
            Long clienteId, Collection<Agendamento.Status> status, LocalDateTime de, LocalDateTime ate);
}
