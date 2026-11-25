package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import br.ueg.trindade.braully_web2_fullstack.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long>{
    
    boolean existsByPermissoesId(Long permissaoId);

    @EntityGraph(attributePaths = "permissoes")
    Optional<Usuario> findByUsername(String username);

    @EntityGraph(attributePaths = "permissoes")
    Optional<Usuario> findWithPermissoesById(Long id);
}
