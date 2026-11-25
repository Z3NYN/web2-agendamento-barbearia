package br.ueg.trindade.braully_web2_fullstack.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ReactController {
    @GetMapping({"/painel", "/inicio", "/catalogo", "/equipe", "/equipe/{id}", "/galeria", "/login", "/cadastro", "/agendar", "/meus-horarios", "/fidelidade", "/perfil", "/agenda",
        "/servicos", "/profissionais", "/expediente", "/clientes", "/clientes/{id}", "/marca",
        "/usuarios", "/usuarios/{id}", "/atribuir-permissoes", "/permissoes", "/permissoes/{id}"})
    public String aplicacao() { return "forward:/index.html"; }
}
