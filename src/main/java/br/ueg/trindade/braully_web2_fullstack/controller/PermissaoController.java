package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.model.Permissao;
import br.ueg.trindade.braully_web2_fullstack.service.PermissaoService;

@RestController
@RequestMapping("/api/permissoes")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasRole('ADMIN')")
public class PermissaoController {
    private final PermissaoService permissoes;

    public PermissaoController(PermissaoService permissoes) { this.permissoes = permissoes; }

    public record Entrada(@NotBlank @Pattern(regexp = "[A-Z][A-Z_0-9]{1,29}") String nome,
                          @NotBlank @Size(max = 220) String descricao) {}

    @GetMapping
    public List<Permissao> listar() { return permissoes.listar(); }

    @GetMapping("/{id}")
    public Permissao buscar(@PathVariable Long id) { return permissoes.buscar(id); }

    @PostMapping
    public Permissao criar(@Valid @RequestBody Entrada e) { return permissoes.criar(e.nome(), e.descricao()); }

    @PutMapping("/{id}")
    public Permissao editar(@PathVariable Long id, @Valid @RequestBody Entrada e) { return permissoes.editar(id, e.nome(), e.descricao()); }

    @DeleteMapping("/{id}")
    public void excluir(@PathVariable Long id) { permissoes.excluir(id); }
}
