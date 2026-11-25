package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import br.ueg.trindade.braully_web2_fullstack.model.Barbeiro;

public interface BarbeiroRepository extends JpaRepository<Barbeiro, Long> {
    List<Barbeiro> findAllByOrderByNomeAsc();
    boolean existsByUsuarioIdAndIdNot(Long usuarioId, Long id);
    boolean existsByUsuarioId(Long usuarioId);
}
