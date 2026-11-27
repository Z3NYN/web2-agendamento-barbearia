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
public class PermissaoController {
    private final PermissaoService permissoes;

    public PermissaoController(PermissaoService permissoes) { this.permissoes = permissoes; }

    public record Entrada(@Pattern(regexp = "[A-Z][A-Z_0-9]{1,59}") String nome,
                          @Size(max = 120) String titulo,
                          @NotBlank @Size(max = 260) String descricao) {}

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PERM_PERMISSOES_GERENCIAR','PERM_ACESSOS_ATRIBUIR')")
    public List<Permissao> listar() { return permissoes.listar(); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PERM_PERMISSOES_GERENCIAR','PERM_ACESSOS_ATRIBUIR')")
    public Permissao buscar(@PathVariable Long id) { return permissoes.buscar(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('PERM_PERMISSOES_GERENCIAR')")
    public Permissao criar(@Valid @RequestBody Entrada e) { return permissoes.criar(e.nome(), e.descricao()); }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_PERMISSOES_GERENCIAR')")
    public Permissao editar(@PathVariable Long id, @Valid @RequestBody Entrada e) {
        return permissoes.editar(id, e.nome(), e.titulo(), e.descricao());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PERM_PERMISSOES_GERENCIAR')")
    public void excluir(@PathVariable Long id) { permissoes.excluir(id); }
}
