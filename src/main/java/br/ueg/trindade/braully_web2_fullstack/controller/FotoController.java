package br.ueg.trindade.braully_web2_fullstack.controller;

import br.ueg.trindade.braully_web2_fullstack.model.Foto;
import br.ueg.trindade.braully_web2_fullstack.service.FotoService;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.time.Duration;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class FotoController {
    private final FotoService fotos;

    public FotoController(FotoService fotos) { this.fotos = fotos; }

    @GetMapping("/publico/fotos")
    public List<FotoService.FotoView> listar() { return fotos.listar(); }

    @GetMapping("/publico/fotos/{id}")
    public ResponseEntity<byte[]> buscar(@PathVariable UUID id) {
        var foto = fotos.buscar(id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(foto.tipo()))
            .cacheControl(CacheControl.maxAge(Duration.ofMinutes(15))).body(foto.bytes());
    }

    @PostMapping(path = "/fotos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAuthority('PERM_GALERIA_GERENCIAR')")
    public FotoService.FotoView salvar(@RequestParam Foto.Alvo alvo, @RequestParam(required = false) Long cadastroId,
                                      @RequestParam(required = false) String legenda,
                                      @RequestParam(required = false) String categoria,
                                      @RequestParam MultipartFile arquivo) throws IOException {
        return fotos.salvar(alvo, cadastroId, legenda, categoria, arquivo);
    }

    @DeleteMapping("/fotos/{id}")
    @PreAuthorize("hasAuthority('PERM_GALERIA_GERENCIAR')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@PathVariable UUID id) { fotos.remover(id); }
}
