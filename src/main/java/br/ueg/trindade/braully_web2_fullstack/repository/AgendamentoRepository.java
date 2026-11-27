package br.ueg.trindade.braully_web2_fullstack.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento;

public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {
    List<Agendamento> findByInicioGreaterThanEqualAndInicioLessThanOrderByInicioAsc(LocalDateTime inicio, LocalDateTime fim);
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
