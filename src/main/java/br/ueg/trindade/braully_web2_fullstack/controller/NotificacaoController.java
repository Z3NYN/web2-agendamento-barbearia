package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.Map;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import br.ueg.trindade.braully_web2_fullstack.service.NotificacaoService;
import br.ueg.trindade.braully_web2_fullstack.service.WebPushService;

@RestController
@RequestMapping("/api")
public class NotificacaoController {
    private final NotificacaoService notificacoes;
    private final WebPushService webPush;

    public NotificacaoController(NotificacaoService notificacoes, WebPushService webPush) {
        this.notificacoes = notificacoes;
        this.webPush = webPush;
    }

    @GetMapping("/publico/push-chave")
    public Map<String, String> chavePublica() {
        return Map.of("publicKey", webPush.chavePublica());
    }

    @GetMapping("/notificacoes")
    @PreAuthorize("isAuthenticated()")
    public NotificacaoService.Painel listar(Authentication auth) {
        return notificacoes.painel(Identidade.id(auth));
    }

    @GetMapping(path = "/notificacoes/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter stream(Authentication auth) {
        return notificacoes.conectarStream(Identidade.id(auth));
    }

    @PutMapping("/notificacoes/{id}/lida")
    @PreAuthorize("isAuthenticated()")
    public NotificacaoService.View marcarLida(@PathVariable Long id, Authentication auth) {
        return notificacoes.marcarLida(id, Identidade.id(auth));
    }

    @PutMapping("/notificacoes/ler-todas")
    @PreAuthorize("isAuthenticated()")
    public void marcarTodasLidas(Authentication auth) {
        notificacoes.marcarTodasLidas(Identidade.id(auth));
    }

    @GetMapping("/notificacoes/preferencias")
    @PreAuthorize("isAuthenticated()")
    public NotificacaoService.Preferencias preferencias(Authentication auth) {
        return notificacoes.preferencias(Identidade.id(auth));
    }

    @PutMapping("/notificacoes/preferencias")
    @PreAuthorize("isAuthenticated()")
    public NotificacaoService.Preferencias atualizarPreferencias(
            @RequestBody NotificacaoService.Preferencias entrada, Authentication auth) {
        return notificacoes.atualizarPreferencias(Identidade.id(auth), entrada);
    }

    @PostMapping("/notificacoes/push/inscrever")
    @PreAuthorize("isAuthenticated()")
    public void inscrever(@Valid @RequestBody NotificacaoService.InscricaoDto entrada, Authentication auth) {
        notificacoes.inscreverPush(Identidade.id(auth), entrada);
    }

    @PostMapping("/notificacoes/push/remover")
    @PreAuthorize("isAuthenticated()")
    public void remover(@RequestBody(required = false) Map<String, String> corpo, Authentication auth) {
        notificacoes.removerPush(Identidade.id(auth), corpo == null ? null : corpo.get("endpoint"));
    }
}
