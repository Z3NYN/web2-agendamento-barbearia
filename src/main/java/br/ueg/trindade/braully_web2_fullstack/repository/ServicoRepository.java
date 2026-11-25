package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import br.ueg.trindade.braully_web2_fullstack.model.Servico;

public interface ServicoRepository extends JpaRepository<Servico, Long> {
    List<Servico> findAllByOrderByNomeAsc();
}
