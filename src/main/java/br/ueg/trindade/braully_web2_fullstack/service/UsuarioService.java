package br.ueg.trindade.braully_web2_fullstack.service;

import java.util.*;
import java.nio.charset.StandardCharsets;
import jakarta.validation.constraints.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.repository.*;

@Service
@Transactional
public class UsuarioService {
    private final UsuarioRepository usuarios;
    private final PermissaoRepository permissoes;
    private final PasswordEncoder encoder;
    private final InstalacaoService instalacao;
    private final BarbeiroRepository barbeiros;
    private final NotificacaoService notificacoes;

    public UsuarioService(UsuarioRepository usuarios, PermissaoRepository permissoes,
                          PasswordEncoder encoder, InstalacaoService instalacao,
                          BarbeiroRepository barbeiros, NotificacaoService notificacoes) {
        this.usuarios = usuarios;
        this.permissoes = permissoes;
        this.encoder = encoder;
        this.instalacao = instalacao;
        this.barbeiros = barbeiros;
        this.notificacoes = notificacoes;
    }

    public record Entrada(@NotBlank @Size(max = 100) String nome,
                          @NotBlank @Pattern(regexp = "[a-zA-Z0-9._-]{3,40}") String username,
                          @NotBlank @Email @Size(max = 150) String email, @Size(max = 72) String senha) {}
    public record Perfil(@NotBlank @Size(max = 100) String nome, @NotBlank @Email @Size(max = 150) String email,
                         @Size(max = 72) String senhaAtual, @Size(max = 72) String novaSenha) {}
    public record Resumo(Long id, String nome, String username, String email, boolean ativo, List<Permissao> permissoes) {}

    public static Resumo resumo(Usuario u) {
        return new Resumo(u.getId(), u.getNome(), u.getUsername(), u.getEmail(), u.isAtivo(),
                u.getPermissoes().stream().sorted(Comparator.comparing(Permissao::getNome)).toList());
    }

    @Transactional(readOnly = true)
    public List<Resumo> listarTodos() {
        return usuarios.findAll().stream().map(UsuarioService::resumo).sorted(Comparator.comparing(Resumo::nome)).toList();
    }

    @Transactional(readOnly = true)
    public Resumo buscarPorId(Long id) {
        return resumo(buscar(id));
    }

    public Usuario buscar(Long id) {
        return usuarios.findWithPermissoesById(id).orElseThrow(Regra::inexistente);
    }

    public Resumo criar(Entrada entrada) {
        return resumo(criarConta(entrada, "CLIENTE"));
    }

    public Usuario criarConta(Entrada e, String papel) {
        String username = e.username().toLowerCase(Locale.ROOT);
        Usuario u = new Usuario(e.nome().strip(), username, codificar(e.senha()), e.email().strip());
        u.getPermissoes().add(permissoes.findByNome(papel).orElseThrow());
        return usuarios.save(u);
    }

    public Resumo atualizar(Long id, Entrada e) {
        instalacao.bloquear();
        Usuario u = buscar(id);
        u.setNome(e.nome().strip());
        String username = e.username().toLowerCase(Locale.ROOT);
        if (!username.equals(u.getUsername())) {
            u.setUsername(username);
            revogarSessaoECanais(u);
        }
        u.setEmail(e.email().strip());
        if (e.senha() != null && !e.senha().isBlank()) {
            u.setSenha(codificar(e.senha()));
            revogarSessaoECanais(u);
        }
        return resumo(u);
    }

    public Resumo atualizarPerfil(Long id, Perfil e) {
        instalacao.bloquear();
        Usuario u = buscar(id);
        u.setNome(e.nome().strip());
        u.setEmail(e.email().strip());
        if (e.novaSenha() != null && !e.novaSenha().isBlank()) {
            if (e.senhaAtual() == null || e.senhaAtual().getBytes(StandardCharsets.UTF_8).length > 72
                    || !encoder.matches(e.senhaAtual(), u.getSenha())) {
                throw Regra.invalida("A senha atual está incorreta.");
            }
            u.setSenha(codificar(e.novaSenha()));
            revogarSessaoECanais(u);
        }
        return resumo(u);
    }

    public void revogarSessoes(Long id) {
        instalacao.bloquear();
        revogarSessaoECanais(buscar(id));
    }

    public void excluir(Long id, Long autor) {
        instalacao.bloquear();
        if (id.equals(autor)) throw Regra.conflito("Você não pode desativar a própria conta.");
        Usuario usuario = buscar(id);
        usuario.setAtivo(false);
        revogarSessaoECanais(usuario);
    }

    public Resumo ativar(Long id) {
        instalacao.bloquear();
        Usuario u = buscar(id);
        u.setAtivo(true);
        return resumo(u);
    }

    public Resumo atribuirPermissoes(Long id, List<Long> ids, Long autor) {
        instalacao.bloquear();
        if (id.equals(autor)) throw Regra.conflito("Sua própria permissão não pode ser alterada.");
        Usuario usuario = buscar(id);
        if (ids.isEmpty() || ids.contains(null)) throw Regra.invalida("Selecione ao menos uma permissão.");
        Set<Permissao> selecao = new HashSet<>(permissoes.findAllById(ids));
        if (selecao.size() != new HashSet<>(ids).size()) throw Regra.invalida("Permissão inválida.");
        if (barbeiros.existsByUsuarioId(id) && selecao.stream().noneMatch(p -> p.getNome().equals("BARBEIRO"))) {
            throw Regra.conflito("Desvincule a conta do profissional antes de remover o perfil BARBEIRO.");
        }
        usuario.setPermissoes(selecao);
        revogarSessaoECanais(usuario);
        return resumo(usuario);
    }

    private void revogarSessaoECanais(Usuario u) {
        u.revogarSessoes();
        if (u.getId() != null) {
            notificacoes.revogarCanaisUsuario(u.getId());
        }
    }

    private String codificar(String senha) {
        if (senha == null || senha.isBlank() || senha.length() < 8 || senha.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw Regra.invalida("A senha precisa ter pelo menos 8 caracteres e no máximo 72 bytes.");
        }
        return encoder.encode(senha);
    }
}
