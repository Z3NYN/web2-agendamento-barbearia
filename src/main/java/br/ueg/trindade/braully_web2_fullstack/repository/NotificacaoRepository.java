package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import br.ueg.trindade.braully_web2_fullstack.model.Notificacao;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {
    List<Notificacao> findTop40ByDestinatarioIdOrderByCriadaEmDescIdDesc(Long destinatarioId);
    long countByDestinatarioIdAndLidaFalse(Long destinatarioId);
    Optional<Notificacao> findByIdAndDestinatarioId(Long id, Long destinatarioId);
    boolean existsByChaveUnica(String chaveUnica);

    @Modifying
    @Query("update Notificacao n set n.lida = true where n.destinatario.id = :uid and n.lida = false")
    int marcarTodasLidas(@Param("uid") Long uid);
}
