package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade;

public interface MovimentoFidelidadeRepository extends JpaRepository<MovimentoFidelidade, Long> {
    List<MovimentoFidelidade> findByClienteIdOrderByIdDesc(Long clienteId);
    boolean existsByPremioIdAndResgatadoEmIsNull(Long premioId);
    boolean existsByAgendamentoIdAndTipo(Long agendamentoId, MovimentoFidelidade.Tipo tipo);
    Optional<MovimentoFidelidade> findByAgendamentoIdAndTipo(Long agendamentoId, MovimentoFidelidade.Tipo tipo);
}
