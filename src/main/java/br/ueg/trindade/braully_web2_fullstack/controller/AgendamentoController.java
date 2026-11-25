package br.ueg.trindade.braully_web2_fullstack.controller;

import java.time.*;
import java.util.List;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.service.*;

@RestController
@RequestMapping("/api")
public class AgendamentoController {
    private final AgendaService agenda;
    private final DisponibilidadeService disponibilidade;

    public AgendamentoController(AgendaService agenda, DisponibilidadeService disponibilidade) {
        this.agenda = agenda;
        this.disponibilidade = disponibilidade;
    }

    @GetMapping("/publico/horarios")
    public List<LocalDateTime> horarios(@RequestParam Long servicoId, @RequestParam(required = false) Long barbeiroId,
                                        @RequestParam LocalDate data) {
        return disponibilidade.horarios(servicoId, barbeiroId, data);
    }

    @GetMapping("/publico/grade-horarios")
    public List<DisponibilidadeService.SlotHorario> gradeHorarios(@RequestParam Long servicoId,
                                                                  @RequestParam(required = false) Long barbeiroId,
                                                                  @RequestParam LocalDate data) {
        return disponibilidade.grade(servicoId, barbeiroId, data);
    }

    @GetMapping("/publico/proximos-horarios")
    public List<LocalDateTime> proximos(@RequestParam Long servicoId, @RequestParam(required = false) Long barbeiroId,
                                        @RequestParam(required = false) LocalDate aPartir) {
        return disponibilidade.proximos(servicoId, barbeiroId, aPartir);
    }

    @GetMapping("/agendamentos")
    @PreAuthorize("hasAnyRole('ADMIN','BARBEIRO','CLIENTE')")
    public List<AgendaService.View> listar(@RequestParam(required = false) LocalDate data,
                                           @RequestParam(required = false) LocalDate ate,
                                           @RequestParam(required = false) Long barbeiroId, Authentication auth) {
        return agenda.listar(auth, data, ate, barbeiroId);
    }

    @GetMapping("/agendamentos/proximos")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AgendaService.View> proximosDaSemana() { return agenda.proximosDaSemana(); }

    @GetMapping("/agendamentos/cliente/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AgendaService.View> cliente(@PathVariable Long id) { return agenda.listarCliente(id, true); }

    @GetMapping("/agendamentos/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','BARBEIRO','CLIENTE')")
    public AgendaService.View buscar(@PathVariable Long id, Authentication auth) { return agenda.buscar(id, auth); }

    @GetMapping("/agendamentos/{id}/horarios")
    @PreAuthorize("hasAnyRole('ADMIN','BARBEIRO','CLIENTE')")
    public List<LocalDateTime> horarios(@PathVariable Long id, @RequestParam Long barbeiroId,
                                        @RequestParam LocalDate data, Authentication auth) {
        return agenda.horariosReagendamento(id, barbeiroId, data, auth);
    }

    @PostMapping("/agendamentos")
    @PreAuthorize("hasAnyRole('ADMIN','CLIENTE')")
    public AgendaService.View criar(@Valid @RequestBody AgendaService.Nova entrada, Authentication auth) {
        return agenda.criar(entrada, auth);
    }

    @PutMapping("/agendamentos/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','BARBEIRO','CLIENTE')")
    public AgendaService.View reagendar(@PathVariable Long id, @Valid @RequestBody AgendaService.Reagendar entrada,
                                        Authentication auth) {
        return agenda.reagendar(id, entrada, auth);
    }

    @PutMapping("/agendamentos/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','BARBEIRO')")
    public AgendaService.View status(@PathVariable Long id, @Valid @RequestBody AlterarStatus entrada, Authentication auth) {
        return agenda.status(id, entrada.status(), auth);
    }

    @DeleteMapping("/agendamentos/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','BARBEIRO','CLIENTE')")
    public AgendaService.View cancelar(@PathVariable Long id, Authentication auth) {
        return agenda.status(id, Status.CANCELADO, auth);
    }

    public record AlterarStatus(@NotNull Status status) {}
}
