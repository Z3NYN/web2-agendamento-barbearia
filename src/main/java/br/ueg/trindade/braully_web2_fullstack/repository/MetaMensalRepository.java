package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import br.ueg.trindade.braully_web2_fullstack.model.MetaMensal;

public interface MetaMensalRepository extends JpaRepository<MetaMensal, Long> {
    Optional<MetaMensal> findByAnoAndMes(int ano, int mes);
    List<MetaMensal> findAllByOrderByAnoDescMesDesc();
}
