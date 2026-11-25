package br.ueg.trindade.braully_web2_fullstack.controller;

import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ErrosApi {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, String>> regra(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("erro", ex.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, String>> validacao(MethodArgumentNotValidException ex) {
        var campo = ex.getBindingResult().getFieldError();
        String mensagem = campo == null ? "Confira os campos do formulário."
                : campo.getField() + " — " + campo.getDefaultMessage();
        return ResponseEntity.badRequest().body(Map.of("erro", mensagem));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, String>> integridade() {
        return ResponseEntity.status(409).body(Map.of("erro", "Já existe um registro com esses dados ou o cadastro tem vínculos."));
    }

    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,
        org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class})
    ResponseEntity<Map<String, String>> formato() {
        return ResponseEntity.badRequest().body(Map.of("erro", "Confira o formato dos campos enviados."));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    ResponseEntity<Map<String, String>> tamanho() {
        return ResponseEntity.status(413).body(Map.of("erro", "A imagem deve ter no máximo 2 MB."));
    }
}
