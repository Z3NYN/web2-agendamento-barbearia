package br.ueg.trindade.braully_web2_fullstack.repository;

import br.ueg.trindade.braully_web2_fullstack.model.Foto;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FotoRepository extends JpaRepository<Foto, UUID> {
    interface Metadados {
        UUID getId();
        Foto.Alvo getAlvo();
        Long getCadastroId();
        String getLegenda();
        String getCategoria();
    }

    @Query("select f.id as id, f.alvo as alvo, f.cadastroId as cadastroId, f.legenda as legenda, f.categoria as categoria from Foto f where f.barbearia.id = :loja order by f.alvo, f.id")
    List<Metadados> metadados(Long loja);
}
