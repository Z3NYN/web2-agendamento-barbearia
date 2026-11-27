package br.ueg.trindade.braully_web2_fullstack.controller;

import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.service.PainelService;
import br.ueg.trindade.braully_web2_fullstack.service.PainelService.*;

@RestController
@RequestMapping("/api/painel")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasAuthority('PERM_DASHBOARD_ANALITICO')")
public class PainelController {

    private final PainelService painel;

    public PainelController(PainelService painel) {
        this.painel = painel;
    }

    @GetMapping("/resumo")
    public ResumoPainel resumo(
            @RequestParam(defaultValue = "ESTE_MES") Periodo periodo,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) Long barbeiroId) {
        return painel.resumo(periodo, inicio, fim, barbeiroId);
    }

    @GetMapping("/profissionais")
    public List<ProfissionalFiltro> profissionais() {
        return painel.listarProfissionaisFiltro();
    }
}
