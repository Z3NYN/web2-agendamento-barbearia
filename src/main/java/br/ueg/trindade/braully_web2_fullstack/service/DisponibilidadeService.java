package br.ueg.trindade.braully_web2_fullstack.service;

import java.time.*;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.repository.*;

@Service
@Transactional
public class DisponibilidadeService {
    private final InstalacaoService instalacao;
    private final CatalogoService catalogo;
    private final ExpedienteRepository expedientes;
    private final BloqueioRepository bloqueios;
    private final AgendamentoRepository agenda;

    public DisponibilidadeService(InstalacaoService instalacao, CatalogoService catalogo, ExpedienteRepository expedientes,
                                  BloqueioRepository bloqueios, AgendamentoRepository agenda) {
        this.instalacao = instalacao;
        this.catalogo = catalogo;
        this.expedientes = expedientes;
        this.bloqueios = bloqueios;
        this.agenda = agenda;
    }

    public record EntradaExpediente(Long barbeiroId, @NotNull DayOfWeek dia, @NotNull LocalTime inicio, @NotNull LocalTime fim) {}
    public record ExpedienteView(Long id, Long barbeiroId, DayOfWeek dia, LocalTime inicio, LocalTime fim) {}
    public record EntradaBloqueio(Long barbeiroId, @NotNull LocalDateTime inicio, @NotNull LocalDateTime fim,
                                  @Size(max = 180) String motivo) {}
    public record BloqueioView(Long id, Long barbeiroId, LocalDateTime inicio, LocalDateTime fim, String motivo) {}
    private record Intervalo(LocalDateTime inicio, LocalDateTime fim) {
        boolean inclui(LocalDateTime de, LocalDateTime ate) {
            return !de.isBefore(inicio) && !ate.isAfter(fim);
        }
        boolean sobrepoe(LocalDateTime de, LocalDateTime ate) {
            return de.isBefore(fim) && ate.isAfter(inicio);
        }
    }

    public static boolean pendente(Agendamento a) {
        return a.status == Agendamento.Status.RESERVADO || a.status == Agendamento.Status.CONFIRMADO;
    }

    private static boolean doBarbeiro(Barbeiro b, Long id) { return b != null && b.getId().equals(id); }
    private static Long id(Barbeiro b) { return b == null ? null : b.getId(); }

    @Transactional(readOnly = true)
    public List<LocalDateTime> horarios(Long servicoId, Long barbeiroId, LocalDate dia) {
        var s = catalogo.servico(servicoId);
        if (!s.ativo) return List.of();
        if (barbeiroId == null) {
            return catalogo.barbeirosAtivos().stream().flatMap(b -> livres(b, dia, s.duracaoMinutos, null).stream())
                    .distinct().sorted().toList();
        }
        var b = catalogo.barbeiro(barbeiroId);
        return b.ativo ? livres(b, dia, s.duracaoMinutos, null) : List.of();
    }

    @Transactional(readOnly = true)
    public List<LocalDateTime> proximos(Long servicoId, Long barbeiroId, LocalDate aPartir) {
        var hoje = Regra.agora().toLocalDate();
        var primeiroDia = aPartir == null || aPartir.isBefore(hoje) ? hoje : aPartir;
        if (primeiroDia.isAfter(hoje.plusDays(90))) return List.of();
        var resultado = new ArrayList<LocalDateTime>();
        for (var dia = primeiroDia; dia.isBefore(primeiroDia.plusDays(14))
                && !dia.isAfter(hoje.plusDays(90)) && resultado.size() < 4; dia = dia.plusDays(1)) {
            var livres = horarios(servicoId, barbeiroId, dia);
            if (!livres.isEmpty()) resultado.add(livres.getFirst());
        }
        return resultado;
    }

    public Barbeiro atribuir(LocalDateTime inicio, int duracao) {
        return catalogo.barbeirosAtivos().stream()
                .filter(b -> livres(b, inicio.toLocalDate(), duracao, null).contains(inicio))
                .findFirst().orElseThrow(() -> Regra.conflito("Esse horário não está mais disponível. Escolha outro."));
    }

    public List<LocalDateTime> livres(Barbeiro b, LocalDate dia, int duracao, Long ignorar) {
        LocalDateTime agora = Regra.agora();
        if (dia.isBefore(agora.toLocalDate()) || dia.isAfter(agora.toLocalDate().plusDays(90))) return List.of();
        var semana = expedientes.findByDia(dia.getDayOfWeek());
        var loja = semana.stream().filter(e -> e.barbeiro == null)
                .map(e -> new Intervalo(dia.atTime(e.inicio), dia.atTime(e.fim))).toList();
        var pessoal = semana.stream().filter(e -> doBarbeiro(e.barbeiro, b.id))
                .map(e -> new Intervalo(dia.atTime(e.inicio), dia.atTime(e.fim))).toList();
        if (loja.isEmpty() || pessoal.isEmpty()) return List.of();
        var inicioDia = dia.atStartOfDay();
        var fimDia = dia.plusDays(1).atStartOfDay();
        var ocupados = new ArrayList<Intervalo>();
        bloqueios.findByInicioLessThanAndFimGreaterThan(fimDia, inicioDia).stream()
                .filter(e -> e.barbeiro == null || doBarbeiro(e.barbeiro, b.id))
                .map(e -> new Intervalo(e.inicio, e.fim)).forEach(ocupados::add);
        agenda.findByBarbeiroIdAndInicioLessThanAndFimGreaterThan(b.id, fimDia, inicioDia).stream()
                .filter(a -> !a.id.equals(ignorar) && a.status != Agendamento.Status.CANCELADO && a.status != Agendamento.Status.FALTOU)
                .map(a -> new Intervalo(a.inicio, a.fim)).forEach(ocupados::add);
        var horarios = new ArrayList<LocalDateTime>();
        for (var hora = inicioDia; hora.isBefore(fimDia); hora = hora.plusMinutes(15)) {
            LocalDateTime inicio = hora;
            LocalDateTime fim = inicio.plusMinutes(duracao);
            if (inicio.isAfter(agora) && loja.stream().anyMatch(i -> i.inclui(inicio, fim))
                    && pessoal.stream().anyMatch(i -> i.inclui(inicio, fim))
                    && ocupados.stream().noneMatch(i -> i.sobrepoe(inicio, fim))) {
                horarios.add(inicio);
            }
        }
        return horarios;
    }

    @Transactional(readOnly = true)
    public List<ExpedienteView> expedientes() { return expedientes.findAll().stream().map(this::view).toList(); }
    @Transactional(readOnly = true)
    public ExpedienteView expediente(Long id) { return view(expedientes.findById(id).orElseThrow(Regra::inexistente)); }
    @Transactional(readOnly = true)
    public List<BloqueioView> bloqueios() { return bloqueios.findAll().stream().map(this::view).toList(); }
    @Transactional(readOnly = true)
    public BloqueioView bloqueio(Long id) { return view(bloqueios.findById(id).orElseThrow(Regra::inexistente)); }

    public ExpedienteView gravar(Long id, EntradaExpediente entrada) {
        Barbearia loja = instalacao.bloquear();
        if (!entrada.inicio().isBefore(entrada.fim())) throw Regra.invalida("O fim deve ser posterior ao início.");
        var barbeiro = entrada.barbeiroId() == null ? null : catalogo.barbeiro(entrada.barbeiroId());
        var e = id == null ? new Expediente() : expedientes.findById(id).orElseThrow(Regra::inexistente);
        var diaAnterior = e.dia;
        Long barbeiroAnterior = id(e.barbeiro);
        e.barbearia = loja;
        e.barbeiro = barbeiro;
        e.dia = entrada.dia();
        e.inicio = entrada.inicio();
        e.fim = entrada.fim();
        expedientes.saveAndFlush(e);
        if (diaAnterior != null) validarReservasNoExpediente(diaAnterior, barbeiroAnterior);
        return view(e);
    }

    public void removerExpediente(Long id) {
        instalacao.bloquear();
        var e = expedientes.findById(id).orElseThrow(Regra::inexistente);
        var dia = e.dia;
        Long barbeiroId = id(e.barbeiro);
        expedientes.delete(e);
        expedientes.flush();
        validarReservasNoExpediente(dia, barbeiroId);
    }

    private void validarReservasNoExpediente(DayOfWeek dia, Long barbeiroId) {
        var agora = Regra.agora();
        var semana = expedientes.findByDia(dia);
        for (var a : agenda.findByInicioLessThanAndFimGreaterThan(agora.plusDays(91), agora)) {
            if (!pendente(a) || a.inicio.getDayOfWeek() != dia
                    || (barbeiroId != null && !doBarbeiro(a.barbeiro, barbeiroId))) continue;
            boolean comercial = semana.stream().anyMatch(e -> e.barbeiro == null && contem(e, a));
            boolean profissional = semana.stream().anyMatch(e -> doBarbeiro(e.barbeiro, a.barbeiro.getId()) && contem(e, a));
            if (!comercial || !profissional) {
                throw Regra.conflito("Existem reservas nesse expediente. Reagende ou cancele esses horários primeiro.");
            }
        }
    }

    private boolean contem(Expediente e, Agendamento a) {
        return !a.inicio.toLocalTime().isBefore(e.inicio) && !a.fim.toLocalTime().isAfter(e.fim);
    }

    public BloqueioView gravar(Long id, EntradaBloqueio entrada) {
        Barbearia loja = instalacao.bloquear();
        if (!entrada.inicio().isBefore(entrada.fim())) throw Regra.invalida("O fim deve ser posterior ao início.");
        var conflitos = agenda.findByInicioLessThanAndFimGreaterThan(entrada.fim(), entrada.inicio());
        if (conflitos.stream().anyMatch(a -> pendente(a)
                && (entrada.barbeiroId() == null || doBarbeiro(a.barbeiro, entrada.barbeiroId())))) {
            throw Regra.conflito("Há reservas nesse intervalo. Reagende ou cancele antes de bloquear.");
        }
        var e = id == null ? new Bloqueio() : bloqueios.findById(id).orElseThrow(Regra::inexistente);
        e.barbearia = loja;
        e.barbeiro = entrada.barbeiroId() == null ? null : catalogo.barbeiro(entrada.barbeiroId());
        e.inicio = entrada.inicio();
        e.fim = entrada.fim();
        e.motivo = entrada.motivo();
        return view(bloqueios.save(e));
    }

    public void removerBloqueio(Long id) {
        instalacao.bloquear();
        bloqueios.delete(bloqueios.findById(id).orElseThrow(Regra::inexistente));
    }

    private ExpedienteView view(Expediente e) { return new ExpedienteView(e.id, id(e.barbeiro), e.dia, e.inicio, e.fim); }
    private BloqueioView view(Bloqueio e) { return new BloqueioView(e.id, id(e.barbeiro), e.inicio, e.fim, e.motivo); }
}
