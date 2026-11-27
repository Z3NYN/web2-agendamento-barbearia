package br.ueg.trindade.braully_web2_fullstack.service;

import java.nio.charset.StandardCharsets;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.repository.*;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import br.ueg.trindade.braully_web2_fullstack.security.PermissaoSistema;

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
    public record Resumo(Long id, String nome, String username, String email, boolean ativo,
                         List<Permissao> permissoes, List<String> permissoesEfetivas) {}

    public static Resumo resumo(Usuario u) {
        return new Resumo(
                u.getId(),
                u.getNome(),
                u.getUsername(),
                u.getEmail(),
                u.isAtivo(),
                u.getPermissoes().stream().sorted(Comparator.comparing(Permissao::getNome)).toList(),
                PermissaoSistema.codigosEfetivos(u.getPermissoes())
        );
    }

    @Transactional(readOnly = true)
    public List<Resumo> listarTodos() {
        return usuarios.findAll().stream().map(UsuarioService::resumo)
                .sorted(Comparator.comparing(Resumo::nome)).toList();
    }

    @Transactional(readOnly = true)
    public List<Resumo> listarClientes() {
        return usuarios.findAll().stream()
                .filter(u -> temPapel(u, "CLIENTE"))
                .map(UsuarioService::resumo)
                .sorted(Comparator.comparing(Resumo::nome))
                .toList();
    }

    @Transactional(readOnly = true)
    public Resumo buscarClientePorId(Long id) {
        Usuario u = buscar(id);
        if (!temPapel(u, "CLIENTE")) {
            throw Regra.inexistente();
        }
        return resumo(u);
    }

    @Transactional(readOnly = true)
    public List<Resumo> listarContasBarbeiro() {
        return usuarios.findAtivosComPapel("BARBEIRO").stream()
                .map(UsuarioService::resumo)
                .sorted(Comparator.comparing(Resumo::nome))
                .toList();
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
        u.setCriadoEm(Regra.agora());
        u.getPermissoes().add(permissoes.findByNome(papel).orElseThrow());
        return usuarios.save(u);
    }

    public Resumo atualizar(Long id, Entrada e, Authentication auth) {
        instalacao.bloquear();
        Usuario u = buscar(id);
        if (temPapel(u, "ADMIN") && !Identidade.tem(auth, "ADMIN")) {
            throw Regra.proibida();
        }
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

    public void excluir(Long id, Authentication auth) {
        instalacao.bloquear();
        if (id.equals(Identidade.id(auth))) throw Regra.conflito("Você não pode desativar a própria conta.");
        Usuario usuario = buscar(id);
        if (temPapel(usuario, "ADMIN") && !Identidade.tem(auth, "ADMIN")) {
            throw Regra.proibida();
        }
        if (ehAdminAtivo(usuario) && contarOutrosAdminsAtivos(id) == 0) {
            throw Regra.conflito("Não é possível desativar o último administrador ativo do sistema.");
        }
        usuario.setAtivo(false);
        revogarSessaoECanais(usuario);
    }

    public Resumo ativar(Long id, Authentication auth) {
        instalacao.bloquear();
        Usuario u = buscar(id);
        if (temPapel(u, "ADMIN") && !Identidade.tem(auth, "ADMIN")) {
            throw Regra.proibida();
        }
        u.setAtivo(true);
        return resumo(u);
    }

    public Resumo atribuirPermissoes(Long id, List<Long> ids, Authentication auth) {
        instalacao.bloquear();
        if (id.equals(Identidade.id(auth))) throw Regra.conflito("Sua própria permissão não pode ser alterada.");
        Usuario usuario = buscar(id);
        if (temPapel(usuario, "ADMIN") && !Identidade.tem(auth, "ADMIN")) {
            throw Regra.proibida();
        }
        if (ids == null || ids.isEmpty() || ids.contains(null)) {
            throw Regra.invalida("Selecione ao menos uma permissão.");
        }
        Set<Permissao> selecao = new HashSet<>(permissoes.findAllById(ids));
        if (selecao.size() != new HashSet<>(ids).size()) throw Regra.invalida("Permissão inválida.");
        for (Permissao p : selecao) {
            if (PermissaoSistema.porCodigo(p.getNome()).isEmpty()) {
                throw Regra.invalida("Permissão sem efeito operacional não pode ser atribuída: " + p.getNome());
            }
        }
        if (!Identidade.tem(auth, "ADMIN")) {
            List<String> desejadas = PermissaoSistema.codigosEfetivos(selecao);
            for (String codigo : desejadas) {
                PermissaoSistema cap = PermissaoSistema.porCodigo(codigo).orElse(null);
                if (cap == null) continue;
                if ("ADMIN".equals(codigo)) {
                    throw Regra.proibida();
                }
                if (!cap.ehPerfil() && !Identidade.temPermissao(auth, cap)) {
                    throw Regra.proibida();
                }
            }
        }
        if (barbeiros.existsByUsuarioId(id) && selecao.stream().noneMatch(p -> p.getNome().equals("BARBEIRO"))) {
            throw Regra.conflito("Desvincule a conta do profissional antes de remover o perfil BARBEIRO.");
        }
        if (ehAdminAtivo(usuario) && !PermissaoSistema.possuiAcessoAdminEssencial(selecao)
                && contarOutrosAdminsAtivos(id) == 0) {
            throw Regra.conflito("Não é possível remover o acesso administrativo essencial do último administrador ativo.");
        }
        usuario.setPermissoes(selecao);
        revogarSessaoECanais(usuario);
        return resumo(usuario);
    }

    private static boolean temPapel(Usuario u, String nome) {
        return u.getPermissoes().stream().anyMatch(p -> nome.equals(p.getNome()));
    }

    private static boolean ehAdminAtivo(Usuario u) {
        return u.isAtivo() && PermissaoSistema.possuiAcessoAdminEssencial(u.getPermissoes());
    }

    private long contarOutrosAdminsAtivos(Long ignorarId) {
        return usuarios.findAll().stream()
                .filter(u -> !Objects.equals(u.getId(), ignorarId) && ehAdminAtivo(u))
                .count();
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
