package br.ueg.trindade.braully_web2_fullstack.service;

import java.util.List;
import org.springframework.security.authentication.BadCredentialsException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.ueg.trindade.braully_web2_fullstack.model.Permissao;
import br.ueg.trindade.braully_web2_fullstack.model.Usuario;
import br.ueg.trindade.braully_web2_fullstack.repository.UsuarioRepository;
import br.ueg.trindade.braully_web2_fullstack.security.JwtUtil;

@Service
public class AuthService {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Transactional(readOnly = true)
    public LoginResposta login(String username, String senha) {
        Usuario usuario = usuarioRepository.findByUsername(username.strip().toLowerCase(java.util.Locale.ROOT))
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

        if (!usuario.isAtivo() || usuario.getSenha() == null
                || senha.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
                || !passwordEncoder.matches(senha, usuario.getSenha())) {
            throw new BadCredentialsException("Credenciais inválidas");
        }

        List<String> permissoes = usuario.getPermissoes().stream()
                .map(Permissao::getNome)
                .toList();

        return new LoginResposta(jwtUtil.gerarToken(usuario), usuario.getNome(), permissoes);
    }

    public record LoginResposta(String token, String nome, List<String> permissoes) {
    }
}
