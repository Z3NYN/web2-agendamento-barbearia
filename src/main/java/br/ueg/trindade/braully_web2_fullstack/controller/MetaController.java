package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.service.MetaService;
import br.ueg.trindade.braully_web2_fullstack.service.MetaService.*;

@RestController
@RequestMapping("/api/metas")
@CrossOrigin(origins = "http://localhost:5173")
public class MetaController {

    private final MetaService metas;

    public MetaController(MetaService metas) {
        this.metas = metas;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('PERM_DASHBOARD_ANALITICO','PERM_METAS_GERENCIAR')")
    public List<ResumoMetaMensal> listar() {
        return metas.listarHistorico();
    }

    @GetMapping("/{ano}/{mes}")
    @PreAuthorize("hasAnyAuthority('PERM_DASHBOARD_ANALITICO','PERM_METAS_GERENCIAR')")
    public ResumoMetaMensal buscar(@PathVariable int ano, @PathVariable int mes) {
        return metas.buscarMes(ano, mes);
    }

    @PutMapping("/{ano}/{mes}")
    @PreAuthorize("hasAuthority('PERM_METAS_GERENCIAR')")
    public ResumoMetaMensal salvar(@PathVariable int ano, @PathVariable int mes, @Valid @RequestBody EntradaMeta entrada) {
        return metas.salvarMes(ano, mes, entrada);
    }

    @DeleteMapping("/{ano}/{mes}")
    @PreAuthorize("hasAuthority('PERM_METAS_GERENCIAR')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@PathVariable int ano, @PathVariable int mes) {
        metas.removerMes(ano, mes);
    }
}
