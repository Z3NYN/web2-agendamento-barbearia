package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import br.ueg.trindade.braully_web2_fullstack.service.UsuarioService;

@RestController
@RequestMapping("/api/usuarios")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasRole('ADMIN')")
public class UsuarioController {
    private final UsuarioService usuarios;

    public UsuarioController(UsuarioService usuarios) { this.usuarios = usuarios; }

    @GetMapping
    public List<UsuarioService.Resumo> listar() { return usuarios.listarTodos(); }

    @GetMapping({"/{id}", "/{id}/permissoes"})
    public UsuarioService.Resumo buscar(@PathVariable Long id) { return usuarios.buscarPorId(id); }

    @PostMapping
    public UsuarioService.Resumo criar(@Valid @RequestBody UsuarioService.Entrada entrada) { return usuarios.criar(entrada); }

    @PutMapping("/{id}")
    public UsuarioService.Resumo editar(@PathVariable Long id, @Valid @RequestBody UsuarioService.Entrada entrada) {
        return usuarios.atualizar(id, entrada);
    }

    @PutMapping("/{id}/ativar")
    public UsuarioService.Resumo ativar(@PathVariable Long id) { return usuarios.ativar(id); }

    @DeleteMapping("/{id}")
    public void excluir(@PathVariable Long id, Authentication auth) { usuarios.excluir(id, Identidade.id(auth)); }

    @PutMapping("/{id}/permissoes")
    public UsuarioService.Resumo atribuir(@PathVariable Long id, @RequestBody List<Long> ids, Authentication auth) {
        return usuarios.atribuirPermissoes(id, ids, Identidade.id(auth));
    }
}
