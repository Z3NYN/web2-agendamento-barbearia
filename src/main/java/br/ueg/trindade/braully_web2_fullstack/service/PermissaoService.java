package br.ueg.trindade.braully_web2_fullstack.service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.Permissao;
import br.ueg.trindade.braully_web2_fullstack.repository.*;
import br.ueg.trindade.braully_web2_fullstack.security.PermissaoSistema;

@Service
@Transactional
public class PermissaoService {
    private final PermissaoRepository permissoes;
    private final UsuarioRepository usuarios;
    private final InstalacaoService instalacao;

    public PermissaoService(PermissaoRepository permissoes, UsuarioRepository usuarios, InstalacaoService instalacao) {
        this.permissoes = permissoes;
        this.usuarios = usuarios;
        this.instalacao = instalacao;
    }

    @Transactional(readOnly = true)
    public List<Permissao> listar() {
        return permissoes.findAll().stream()
                .sorted(Comparator.comparingInt((Permissao p) -> PermissaoSistema.porCodigo(p.getNome())
                                .map(PermissaoSistema::ordem)
                                .orElse(999))
                        .thenComparing(Permissao::getNome))
                .toList();
    }

    @Transactional(readOnly = true)
    public Permissao buscar(Long id) {
        return permissoes.findById(id).orElseThrow(Regra::inexistente);
    }

    public Permissao criar(String nome, String descricao) {
        throw Regra.invalida("Permissões arbitrárias não podem ser criadas. Apenas permissões vinculadas a capacidades reais do sistema são suportadas.");
    }

    public Permissao editar(Long id, String nome, String titulo, String descricao) {
        instalacao.bloquear();
        Permissao p = buscar(id);
        boolean catalogada = p.isSistema() || PermissaoSistema.porCodigo(p.getNome()).isPresent();
        if (nome != null && !nome.isBlank()) {
            String normalizado = nome.strip().toUpperCase(Locale.ROOT);
            if (!p.getNome().equals(normalizado)) {
                throw Regra.conflito("O identificador técnico de autorização não pode ser alterado.");
            }
        } else if (!catalogada) {
            throw Regra.conflito("O identificador técnico de autorização não pode ser removido.");
        }
        if (titulo != null && !titulo.isBlank()) {
            p.setTitulo(titulo.strip());
        }
        p.setDescricao(descricao.strip());
        return p;
    }

    public void excluir(Long id) {
        instalacao.bloquear();
        Permissao p = buscar(id);
        if (p.isSistema() || PermissaoSistema.porCodigo(p.getNome()).isPresent() || usuarios.existsByPermissoesId(id)) {
            throw Regra.conflito("Essa permissão faz parte do catálogo do sistema ou está atribuída a um usuário.");
        }
        permissoes.delete(p);
    }
}
