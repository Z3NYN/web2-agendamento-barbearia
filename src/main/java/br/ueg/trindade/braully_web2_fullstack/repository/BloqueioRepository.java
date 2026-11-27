package br.ueg.trindade.braully_web2_fullstack.repository;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.ueg.trindade.braully_web2_fullstack.model.Bloqueio;

public interface BloqueioRepository extends JpaRepository<Bloqueio, Long> {
    List<Bloqueio> findByInicioLessThanAndFimGreaterThan(LocalDateTime fim, LocalDateTime inicio);

    @Query("select b from Bloqueio b left join fetch b.barbeiro where b.inicio < :fim and b.fim > :inicio")
    List<Bloqueio> findComBarbeiroNoIntervalo(@Param("fim") LocalDateTime fim, @Param("inicio") LocalDateTime inicio);
}
