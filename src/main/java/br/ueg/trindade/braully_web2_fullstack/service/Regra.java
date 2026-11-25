package br.ueg.trindade.braully_web2_fullstack.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class Regra {
    private Regra() {}

    public static LocalDateTime agora() {
        return LocalDateTime.now(ZoneId.of("America/Sao_Paulo"));
    }

    public static ResponseStatusException inexistente() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Registro não encontrado.");
    }

    public static ResponseStatusException invalida(String mensagem) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, mensagem);
    }

    public static ResponseStatusException conflito(String mensagem) {
        return new ResponseStatusException(HttpStatus.CONFLICT, mensagem);
    }

    public static ResponseStatusException proibida() {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, "Você não tem acesso a esta operação.");
    }
}
