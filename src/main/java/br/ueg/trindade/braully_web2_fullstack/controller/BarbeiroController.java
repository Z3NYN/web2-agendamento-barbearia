package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.service.CatalogoService;
import br.ueg.trindade.braully_web2_fullstack.service.CatalogoService.BarbeiroView;
import br.ueg.trindade.braully_web2_fullstack.service.CatalogoService.EntradaBarbeiro;

@RestController
@RequestMapping("/api/barbeiros")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasAuthority('PERM_PROFISSIONAIS_GERENCIAR')")
public class BarbeiroController {
    private final CatalogoService catalogo;

    public BarbeiroController(CatalogoService catalogo) { this.catalogo = catalogo; }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PERM_PROFISSIONAIS_GERENCIAR','PERM_DISPONIBILIDADE_GERENCIAR')")
    public List<BarbeiroView> listar() { return catalogo.barbeiros(false); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('PERM_PROFISSIONAIS_GERENCIAR','PERM_DISPONIBILIDADE_GERENCIAR')")
    public BarbeiroView buscar(@PathVariable Long id) { return catalogo.detalheBarbeiro(id); }

    @PostMapping
    public BarbeiroView criar(@Valid @RequestBody EntradaBarbeiro entrada) { return catalogo.gravar(null, entrada); }

    @PutMapping("/{id}")
    public BarbeiroView editar(@PathVariable Long id, @Valid @RequestBody EntradaBarbeiro entrada) {
        return catalogo.gravar(id, entrada);
    }

    @DeleteMapping("/{id}")
    public void excluir(@PathVariable Long id) { catalogo.excluirBarbeiro(id); }
}
