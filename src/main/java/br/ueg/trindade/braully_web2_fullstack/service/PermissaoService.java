package br.ueg.trindade.braully_web2_fullstack.service;

import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.Permissao;
import br.ueg.trindade.braully_web2_fullstack.repository.*;

@Service
@Transactional
public class PermissaoService {
    private static final Set<String> PADRAO = Set.of("ADMIN", "BARBEIRO", "CLIENTE");
    private final PermissaoRepository permissoes;
    private final UsuarioRepository usuarios;
    private final InstalacaoService instalacao;

    public PermissaoService(PermissaoRepository permissoes, UsuarioRepository usuarios, InstalacaoService instalacao) {
        this.permissoes = permissoes;
        this.usuarios = usuarios;
        this.instalacao = instalacao;
    }

    @Transactional(readOnly = true)
    public List<Permissao> listar() { return permissoes.findAll(); }

    public Permissao buscar(Long id) { return permissoes.findById(id).orElseThrow(Regra::inexistente); }

    public Permissao criar(String nome, String descricao) { return permissoes.save(new Permissao(nome, descricao)); }

    public Permissao editar(Long id, String nome, String descricao) {
        instalacao.bloquear();
        Permissao p = buscar(id);
        if (PADRAO.contains(p.getNome()) && !p.getNome().equals(nome)) {
            throw Regra.conflito("O identificador de um perfil do sistema é fixo.");
        }
        p.setNome(nome);
        p.setDescricao(descricao);
        return p;
    }

    public void excluir(Long id) {
        instalacao.bloquear();
        Permissao p = buscar(id);
        if (PADRAO.contains(p.getNome()) || usuarios.existsByPermissoesId(id)) {
            throw Regra.conflito("Essa permissão é do sistema ou está atribuída a um usuário.");
        }
        permissoes.delete(p);
    }
}
