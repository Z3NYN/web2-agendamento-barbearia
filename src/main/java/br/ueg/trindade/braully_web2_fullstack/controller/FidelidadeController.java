package br.ueg.trindade.braully_web2_fullstack.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import br.ueg.trindade.braully_web2_fullstack.service.*;

@RestController
@RequestMapping("/api/fidelidade")
@CrossOrigin(origins = "http://localhost:5173")
public class FidelidadeController {
    private final FidelidadeService fidelidade;
    private final UsuarioService usuarios;

    public FidelidadeController(FidelidadeService fidelidade, UsuarioService usuarios) {
        this.fidelidade = fidelidade;
        this.usuarios = usuarios;
    }

    @GetMapping
    @PreAuthorize("hasRole('CLIENTE')")
    public FidelidadeService.Cartao meu(Authentication auth) { return fidelidade.cartao(Identidade.id(auth)); }

    @GetMapping("/{clienteId}")
    @PreAuthorize("hasAuthority('PERM_FIDELIDADE_ADMINISTRAR')")
    public FidelidadeService.Cartao cliente(@PathVariable Long clienteId) {
        usuarios.buscarClientePorId(clienteId);
        return fidelidade.cartao(clienteId);
    }
}
