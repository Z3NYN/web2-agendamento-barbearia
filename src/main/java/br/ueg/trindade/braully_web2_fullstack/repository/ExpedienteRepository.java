package br.ueg.trindade.braully_web2_fullstack.repository;

import java.time.DayOfWeek;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import br.ueg.trindade.braully_web2_fullstack.model.Expediente;

public interface ExpedienteRepository extends JpaRepository<Expediente, Long> {
    List<Expediente> findByDia(DayOfWeek dia);
}
