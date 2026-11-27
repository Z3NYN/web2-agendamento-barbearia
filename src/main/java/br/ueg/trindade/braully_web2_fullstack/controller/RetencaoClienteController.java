package br.ueg.trindade.braully_web2_fullstack.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import br.ueg.trindade.braully_web2_fullstack.security.PermissaoSistema;
import br.ueg.trindade.braully_web2_fullstack.service.RetencaoClienteService;
import br.ueg.trindade.braully_web2_fullstack.service.RetencaoClienteService.*;

@RestController
@RequestMapping("/api/clientes/retencao")
@CrossOrigin(origins = "http://localhost:5173")
@PreAuthorize("hasAuthority('PERM_CLIENTES_GERENCIAR')")
public class RetencaoClienteController {

    private final RetencaoClienteService retencao;

    public RetencaoClienteController(RetencaoClienteService retencao) {
        this.retencao = retencao;
    }

    @GetMapping
    public PainelRetencao listar(
            @RequestParam(required = false) String busca,
            @RequestParam(required = false) StatusRetencao status,
            @RequestParam(defaultValue = "ATRASO") Ordenacao ordenar,
            Authentication auth) {
        boolean podeFidelidade = Identidade.temPermissao(auth, PermissaoSistema.FIDELIDADE_ADMINISTRAR);
        return retencao.listar(busca, status, ordenar, podeFidelidade);
    }

    @GetMapping("/{id}")
    public ClienteRetencao buscar(@PathVariable Long id, Authentication auth) {
        boolean podeFidelidade = Identidade.temPermissao(auth, PermissaoSistema.FIDELIDADE_ADMINISTRAR);
        return retencao.buscarCliente(id, podeFidelidade);
    }
}
