package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.service.DisponibilidadeService;
import br.ueg.trindade.braully_web2_fullstack.service.DisponibilidadeService.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasAuthority('PERM_DISPONIBILIDADE_GERENCIAR')")
public class DisponibilidadeController {
    private final DisponibilidadeService disponibilidade;

    public DisponibilidadeController(DisponibilidadeService disponibilidade) { this.disponibilidade = disponibilidade; }

    @GetMapping("/expedientes")
    public List<ExpedienteView> expedientes() { return disponibilidade.expedientes(); }

    @GetMapping("/expedientes/{id}")
    public ExpedienteView expediente(@PathVariable Long id) { return disponibilidade.expediente(id); }

    @PostMapping("/expedientes")
    public ExpedienteView expediente(@Valid @RequestBody EntradaExpediente e) { return disponibilidade.gravar(null, e); }

    @PutMapping("/expedientes/{id}")
    public ExpedienteView expediente(@PathVariable Long id, @Valid @RequestBody EntradaExpediente e) {
        return disponibilidade.gravar(id, e);
    }

    @DeleteMapping("/expedientes/{id}")
    public void removerExpediente(@PathVariable Long id) { disponibilidade.removerExpediente(id); }

    @GetMapping("/bloqueios")
    public List<BloqueioView> bloqueios() { return disponibilidade.bloqueios(); }

    @GetMapping("/bloqueios/{id}")
    public BloqueioView bloqueio(@PathVariable Long id) { return disponibilidade.bloqueio(id); }

    @PostMapping("/bloqueios")
    public BloqueioView bloqueio(@Valid @RequestBody EntradaBloqueio e) { return disponibilidade.gravar(null, e); }

    @PutMapping("/bloqueios/{id}")
    public BloqueioView bloqueio(@PathVariable Long id, @Valid @RequestBody EntradaBloqueio e) {
        return disponibilidade.gravar(id, e);
    }

    @DeleteMapping("/bloqueios/{id}")
    public void removerBloqueio(@PathVariable Long id) { disponibilidade.removerBloqueio(id); }
}
