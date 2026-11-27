package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.ueg.trindade.braully_web2_fullstack.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long>{
    
    boolean existsByPermissoesId(Long permissaoId);

    @EntityGraph(attributePaths = "permissoes")
    Optional<Usuario> findByUsername(String username);

    @EntityGraph(attributePaths = "permissoes")
    Optional<Usuario> findWithPermissoesById(Long id);

    @Query("select distinct u from Usuario u join u.permissoes p where u.ativo = true and p.nome = :papel")
    java.util.List<Usuario> findAtivosComPapel(@Param("papel") String papel);

    @EntityGraph(attributePaths = "permissoes")
    @Query("select distinct u from Usuario u join u.permissoes p where p.nome = 'CLIENTE'")
    java.util.List<Usuario> findTodosClientes();

    @Query("select count(distinct u.id) from Usuario u join u.permissoes p "
            + "where p.nome = 'CLIENTE' and u.criadoEm >= :inicio and u.criadoEm < :fim")
    long contarClientesCriadosNoPeriodo(@Param("inicio") java.time.LocalDateTime inicio,
                                        @Param("fim") java.time.LocalDateTime fim);

    @Query("select count(distinct u.id) from Usuario u join u.permissoes p "
            + "where p.nome = 'CLIENTE' and u.criadoEm is null")
    long contarClientesSemDataCadastro();
}
