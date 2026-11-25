package br.ueg.trindade.braully_web2_fullstack.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.ueg.trindade.braully_web2_fullstack.model.Permissao;

public interface PermissaoRepository extends JpaRepository<Permissao, Long> {

    Optional<Permissao> findByNome(String nome);
}
