package br.ueg.trindade.braully_web2_fullstack.security;

import java.io.IOException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import br.ueg.trindade.braully_web2_fullstack.repository.UsuarioRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final JwtUtil jwt;
    private final UsuarioRepository usuarios;

    public JwtFilter(JwtUtil jwt, UsuarioRepository usuarios) {
        this.jwt = jwt;
        this.usuarios = usuarios;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getServletPath().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            autenticar(header.substring(7));
        }
        chain.doFilter(req, res);
    }

    private void autenticar(String token) {
        try {
            var claims = jwt.extrairClaims(token);
            Long versao = claims.get("versao", Long.class);
            usuarios.findWithPermissoesById(Long.valueOf(claims.getSubject()))
                    .filter(u -> u.isAtivo() && versao != null && u.getVersaoSessao() == versao)
                    .ifPresent(usuario -> {
                        var autoridades = PermissaoSistema.construirAutoridades(usuario.getPermissoes());
                        var identidade = new Identidade(usuario.getId(), usuario.getUsername());
                        SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(identidade, null, autoridades));
                    });
        } catch (JwtException | IllegalArgumentException ignored) {
            SecurityContextHolder.clearContext();
        }
    }
}
