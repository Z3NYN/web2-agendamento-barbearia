package br.ueg.trindade.braully_web2_fullstack.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import br.ueg.trindade.braully_web2_fullstack.model.Bloqueio;

public interface BloqueioRepository extends JpaRepository<Bloqueio, Long> {
    List<Bloqueio> findByInicioLessThanAndFimGreaterThan(LocalDateTime fim, LocalDateTime inicio);
}
