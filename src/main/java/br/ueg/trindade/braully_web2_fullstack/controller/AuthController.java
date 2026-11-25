package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import br.ueg.trindade.braully_web2_fullstack.service.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class AuthController {
    private final AuthService auth;
    private final UsuarioService usuarios;

    public AuthController(AuthService auth, UsuarioService usuarios) {
        this.auth = auth;
        this.usuarios = usuarios;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(auth.login(request.username(), request.senha()));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401).body(Map.of("erro", "Usuário ou senha inválidos."));
        }
    }

    @PostMapping("/cadastro")
    public UsuarioService.Resumo cadastro(@Valid @RequestBody UsuarioService.Entrada entrada) {
        return usuarios.criar(entrada);
    }

    @GetMapping("/perfil")
    public UsuarioService.Resumo perfil(Authentication auth) {
        return usuarios.buscarPorId(Identidade.id(auth));
    }

    @PutMapping("/perfil")
    public UsuarioService.Resumo perfil(@Valid @RequestBody UsuarioService.Perfil entrada, Authentication auth) {
        return usuarios.atualizarPerfil(Identidade.id(auth), entrada);
    }

    @PostMapping("/logout")
    public void sair(Authentication auth) {
        usuarios.revogarSessoes(Identidade.id(auth));
    }

    public record LoginRequest(@NotBlank @Size(max = 40) String username, @NotBlank @Size(max = 72) String senha) {}
}
