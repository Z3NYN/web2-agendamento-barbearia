package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import br.ueg.trindade.braully_web2_fullstack.model.Barbearia;

public interface BarbeariaRepository extends JpaRepository<Barbearia, Long> {
    Optional<Barbearia> findFirstByOrderByIdAsc();

    @Query("select min(b.id) from Barbearia b")
    Optional<Long> idInstalacao();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Barbearia b where b.id = :id")
    Optional<Barbearia> bloquear(Long id);
}
