package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.service.CatalogoService;
import br.ueg.trindade.braully_web2_fullstack.service.CatalogoService.ServicoView;
import br.ueg.trindade.braully_web2_fullstack.service.CatalogoService.EntradaServico;

@RestController
@RequestMapping("/api/servicos")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasRole('ADMIN')")
public class ServicoController {
    private final CatalogoService catalogo;

    public ServicoController(CatalogoService catalogo) { this.catalogo = catalogo; }

    @GetMapping
    public List<ServicoView> listar() { return catalogo.servicos(false); }

    @GetMapping("/{id}")
    public ServicoView buscar(@PathVariable Long id) { return catalogo.detalheServico(id); }

    @PostMapping
    public ServicoView criar(@Valid @RequestBody EntradaServico entrada) { return catalogo.gravar(null, entrada); }

    @PutMapping("/{id}")
    public ServicoView editar(@PathVariable Long id, @Valid @RequestBody EntradaServico entrada) {
        return catalogo.gravar(id, entrada);
    }

    @DeleteMapping("/{id}")
    public void excluir(@PathVariable Long id) { catalogo.excluirServico(id); }
}
