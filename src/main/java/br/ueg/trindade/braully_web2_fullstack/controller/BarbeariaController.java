package br.ueg.trindade.braully_web2_fullstack.controller;

import java.io.IOException;
import java.util.List;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import br.ueg.trindade.braully_web2_fullstack.service.*;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class BarbeariaController {
    private final MarcaService marca;
    private final CatalogoService catalogo;
    private final DisponibilidadeService disponibilidade;

    public BarbeariaController(MarcaService marca, CatalogoService catalogo, DisponibilidadeService disponibilidade) {
        this.marca = marca;
        this.catalogo = catalogo;
        this.disponibilidade = disponibilidade;
    }

    @GetMapping("/publico/barbearia")
    public MarcaService.Marca marca() { return marca.atual(); }

    @GetMapping("/publico/expediente")
    public List<DisponibilidadeService.ExpedienteView> expediente() {
        return disponibilidade.expedientes().stream().filter(f -> f.barbeiroId() == null).toList();
    }

    @GetMapping("/publico/logo")
    public ResponseEntity<byte[]> logo() {
        var imagem = marca.logo();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(imagem.tipo()))
                .cacheControl(CacheControl.noCache()).body(imagem.bytes());
    }

    @GetMapping("/publico/servicos")
    public List<CatalogoService.ServicoView> servicos() { return catalogo.servicos(true); }

    @GetMapping("/publico/barbeiros")
    public List<CatalogoService.BarbeiroView> barbeiros() { return catalogo.barbeiros(true); }

    @PutMapping("/barbearia")
    @PreAuthorize("hasRole('ADMIN')")
    public MarcaService.Marca editar(@Valid @RequestBody MarcaService.Entrada entrada) { return marca.atualizar(entrada); }

    @PostMapping(path = "/barbearia/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public MarcaService.Marca logo(@RequestParam("arquivo") MultipartFile arquivo) throws IOException {
        return marca.enviarLogo(arquivo);
    }

    @DeleteMapping("/barbearia/logo")
    @PreAuthorize("hasRole('ADMIN')")
    public MarcaService.Marca removerLogo() { return marca.removerLogo(); }
}
