package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.InscricaoPush;

public interface InscricaoPushRepository extends JpaRepository<InscricaoPush, Long> {
    List<InscricaoPush> findByUsuarioId(Long usuarioId);
    Optional<InscricaoPush> findByEndpoint(String endpoint);
    void deleteByEndpointAndUsuarioId(String endpoint, Long usuarioId);
    void deleteByUsuarioId(Long usuarioId);
    void deleteByEndpoint(String endpoint);

    @Modifying
    @Transactional
    @Query("delete from InscricaoPush i where i.endpoint = :endpoint")
    void removerPorEndpoint(@Param("endpoint") String endpoint);
}
