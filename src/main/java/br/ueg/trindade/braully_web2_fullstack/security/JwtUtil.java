package br.ueg.trindade.braully_web2_fullstack.security;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import br.ueg.trindade.braully_web2_fullstack.model.Permissao;
import br.ueg.trindade.braully_web2_fullstack.model.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtUtil {

    @Value("${jwt.validade-ms}")
    private long validadeMs;

    @Value("${jwt.secret}")
    private String secret;

    private SecretKey chave;

    @jakarta.annotation.PostConstruct
    void inicializarChave() {
        chave = secret.isBlank() ? Jwts.SIG.HS256.key().build()
                : Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String gerarToken(Usuario usuario) {
        List<String> permissoes = usuario.getPermissoes().stream()
                .map(Permissao::getNome)
                .toList();

        return Jwts.builder()
                .subject(usuario.getId().toString())
                .claim("versao", usuario.getVersaoSessao())
                .id(java.util.UUID.randomUUID().toString())
                .claim("permissoes", permissoes)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + validadeMs))
                .signWith(chave)
                .compact();
    }

    public Claims extrairClaims(String token) {
        return Jwts.parser()
                .verifyWith(chave)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
