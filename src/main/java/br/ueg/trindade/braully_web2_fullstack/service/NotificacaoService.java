package br.ueg.trindade.braully_web2_fullstack.service;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import jakarta.validation.constraints.NotBlank;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.model.Notificacao.Tipo;
import br.ueg.trindade.braully_web2_fullstack.repository.*;
import br.ueg.trindade.braully_web2_fullstack.security.Identidade;
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional
public class NotificacaoService {
    private static final DateTimeFormatter DATA_HORA_FMT = DateTimeFormatter.ofPattern("dd/MM 'às' HH:mm", Locale.forLanguageTag("pt-BR"));

    private final NotificacaoRepository notificacoes;
    private final InscricaoPushRepository inscricoes;
    private final UsuarioRepository usuarios;
    private final AgendamentoRepository agenda;
    private final WebPushService webPush;
    private final ObjectMapper json;
    private final ConcurrentHashMap<Long, CopyOnWriteArrayList<SseEmitter>> emissores = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Boolean> chavesProcessadas = new ConcurrentHashMap<>();

    public NotificacaoService(NotificacaoRepository notificacoes, InscricaoPushRepository inscricoes,
                              UsuarioRepository usuarios, AgendamentoRepository agenda,
                              WebPushService webPush, ObjectMapper json) {
        this.notificacoes = notificacoes;
        this.inscricoes = inscricoes;
        this.usuarios = usuarios;
        this.agenda = agenda;
        this.webPush = webPush;
        this.json = json;
    }

    public record View(Long id, Tipo tipo, String titulo, String mensagem, String destinoUrl, boolean lida, LocalDateTime criadaEm) {}
    public record Painel(long naoLidas, List<View> itens) {}
    public record Preferencias(boolean notifSistema, boolean notifPush, boolean notifLembretes, boolean notifFidelidade) {}
    public record InscricaoDto(@NotBlank String endpoint, @NotBlank String p256dh, @NotBlank String auth) {}

    public SseEmitter conectarStream(Long usuarioId) {
        var emitter = new SseEmitter(300_000L);
        var lista = emissores.computeIfAbsent(usuarioId, k -> new CopyOnWriteArrayList<>());
        lista.add(emitter);
        Runnable remover = () -> removerEmissor(usuarioId, emitter);
        emitter.onCompletion(remover);
        emitter.onTimeout(remover);
        emitter.onError(e -> remover.run());
        try {
            emitter.send(SseEmitter.event().name("conectado").data("ok"));
        } catch (IOException e) {
            remover.run();
            emitter.complete();
        }
        return emitter;
    }

    private void removerEmissor(Long usuarioId, SseEmitter emitter) {
        var lista = emissores.get(usuarioId);
        if (lista != null) {
            lista.remove(emitter);
            if (lista.isEmpty()) emissores.remove(usuarioId, lista);
        }
    }

    public Painel painel(Long usuarioId) {
        emitirLembretesDoCliente(usuarioId);
        var lista = notificacoes.findTop40ByDestinatarioIdOrderByCriadaEmDescIdDesc(usuarioId)
                .stream().map(NotificacaoService::view).toList();
        long naoLidas = notificacoes.countByDestinatarioIdAndLidaFalse(usuarioId);
        return new Painel(naoLidas, lista);
    }

    public View marcarLida(Long id, Long usuarioId) {
        var n = notificacoes.findByIdAndDestinatarioId(id, usuarioId).orElseThrow(Regra::inexistente);
        n.lida = true;
        return view(n);
    }

    public void marcarTodasLidas(Long usuarioId) {
        notificacoes.marcarTodasLidas(usuarioId);
    }

    @Transactional(readOnly = true)
    public Preferencias preferencias(Long usuarioId) {
        var u = usuarios.findById(usuarioId).orElseThrow(Regra::inexistente);
        return new Preferencias(u.isNotifSistema(), u.isNotifPush(), u.isNotifLembretes(), u.isNotifFidelidade());
    }

    public Preferencias atualizarPreferencias(Long usuarioId, Preferencias p) {
        var u = usuarios.findById(usuarioId).orElseThrow(Regra::inexistente);
        u.setNotifSistema(p.notifSistema());
        u.setNotifPush(p.notifPush());
        u.setNotifLembretes(p.notifLembretes());
        u.setNotifFidelidade(p.notifFidelidade());
        return p;
    }

    public void inscreverPush(Long usuarioId, InscricaoDto dto) {
        webPush.validarEndpoint(dto.endpoint());
        webPush.validarChavesInscricao(dto.p256dh(), dto.auth());
        var u = usuarios.findById(usuarioId).orElseThrow(Regra::inexistente);
        String endpointLimpo = dto.endpoint().trim();
        var opt = inscricoes.findByEndpoint(endpointLimpo);
        Long donoAnteriorId = opt.map(i -> i.usuario.getId()).filter(id -> !id.equals(usuarioId)).orElse(null);
        var sub = opt.orElseGet(InscricaoPush::new);
        sub.usuario = u;
        sub.endpoint = endpointLimpo;
        sub.p256dh = dto.p256dh().trim();
        sub.auth = dto.auth().trim();
        sub.criadaEm = Regra.agora();
        inscricoes.saveAndFlush(sub);
        u.setNotifPush(true);
        if (donoAnteriorId != null && inscricoes.findByUsuarioId(donoAnteriorId).isEmpty()) {
            usuarios.findById(donoAnteriorId).ifPresent(ant -> ant.setNotifPush(false));
        }
    }

    public void removerPush(Long usuarioId, String endpoint) {
        if (endpoint != null && !endpoint.isBlank()) {
            inscricoes.deleteByEndpointAndUsuarioId(endpoint.trim(), usuarioId);
        }
        if (inscricoes.findByUsuarioId(usuarioId).isEmpty()) {
            usuarios.findById(usuarioId).ifPresent(u -> u.setNotifPush(false));
        }
    }

    public void revogarCanaisUsuario(Long usuarioId) {
        inscricoes.deleteByUsuarioId(usuarioId);
        usuarios.findById(usuarioId).ifPresent(u -> u.setNotifPush(false));
        Runnable fecharStreams = () -> encerrarStreams(usuarioId);
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    fecharStreams.run();
                }
            });
        } else {
            fecharStreams.run();
        }
    }

    private void encerrarStreams(Long usuarioId) {
        var lista = emissores.remove(usuarioId);
        if (lista != null) {
            for (SseEmitter emitter : lista) {
                try { emitter.complete(); } catch (Exception ignored) { /* Conexão já encerrada. */ }
            }
        }
    }

    public void aoCriarAgendamento(Agendamento a, Authentication auth) {
        String horario = DATA_HORA_FMT.format(a.inicio);
        String chaveBase = "NOVO:" + a.id;

        if (!Identidade.id(auth).equals(a.cliente.getId())) {
            registrar(a.cliente, Tipo.NOVO_AGENDAMENTO, "Novo agendamento",
                    a.nomeServico + " com " + a.barbeiro.getNome() + " em " + horario + ".",
                    "/meus-horarios", chaveBase + ":" + a.cliente.getId());
        } else {
            registrar(a.cliente, Tipo.NOVO_AGENDAMENTO, "Reserva registrada",
                    a.nomeServico + " com " + a.barbeiro.getNome() + " em " + horario + ".",
                    "/meus-horarios", chaveBase + ":" + a.cliente.getId());
        }

        String primeiroNome = primeiroNome(a.cliente.getNome());
        for (Usuario dest : equipeDestinatarios(a)) {
            registrar(dest, Tipo.NOVO_AGENDAMENTO, "Novo agendamento",
                    primeiroNome + " · " + a.nomeServico + " (" + a.barbeiro.getNome() + ") em " + horario + ".",
                    "/agenda?data=" + a.inicio.toLocalDate(), chaveBase + ":" + dest.getId());
        }
    }

    public void aoConfirmar(Agendamento a) {
        String horario = DATA_HORA_FMT.format(a.inicio);
        registrar(a.cliente, Tipo.CONFIRMADO, "Atendimento confirmado",
                a.nomeServico + " com " + a.barbeiro.getNome() + " em " + horario + ".",
                "/meus-horarios", "CONFIRMADO:" + a.id + ":" + a.inicio);
    }

    public void aoCancelar(Agendamento a, boolean pelaEquipe) {
        String horario = DATA_HORA_FMT.format(a.inicio);
        String chaveBase = "CANCELADO:" + a.id + ":" + a.inicio;
        if (pelaEquipe) {
            registrar(a.cliente, Tipo.CANCELADO, "Agendamento cancelado",
                    a.nomeServico + " de " + horario + " foi cancelado pela barbearia.",
                    "/meus-horarios", chaveBase + ":" + a.cliente.getId());
        } else {
            String primeiroNome = primeiroNome(a.cliente.getNome());
            for (Usuario dest : equipeDestinatarios(a)) {
                registrar(dest, Tipo.CANCELADO, "Reserva cancelada",
                        primeiroNome + " cancelou " + a.nomeServico + " de " + horario + ".",
                        "/agenda?data=" + a.inicio.toLocalDate(), chaveBase + ":" + dest.getId());
            }
        }
    }

    public void aoReagendar(Agendamento a, boolean pelaEquipe) {
        String horario = DATA_HORA_FMT.format(a.inicio);
        String chaveBase = "REAGENDADO:" + a.id + ":" + a.inicio + ":" + a.barbeiro.getId();
        if (pelaEquipe) {
            registrar(a.cliente, Tipo.REAGENDADO, "Horário reagendado",
                    a.nomeServico + " alterado para " + horario + " com " + a.barbeiro.getNome() + ".",
                    "/meus-horarios", chaveBase + ":" + a.cliente.getId());
        } else {
            String primeiroNome = primeiroNome(a.cliente.getNome());
            for (Usuario dest : equipeDestinatarios(a)) {
                registrar(dest, Tipo.REAGENDADO, "Horário reagendado",
                        primeiroNome + " remarcou " + a.nomeServico + " para " + horario + ".",
                        "/agenda?data=" + a.inicio.toLocalDate(), chaveBase + ":" + dest.getId());
            }
        }
    }

    public void aoLiberarRecompensa(Usuario cliente, MovimentoFidelidade premio) {
        registrar(cliente, Tipo.RECOMPENSA_FIDELIDADE, "Recompensa disponível",
                "Você liberou: " + premio.nomePremio + " gratuito no cartão fidelidade.",
                "/fidelidade", "FIDELIDADE:" + premio.id);
    }

    @Scheduled(fixedDelay = 60_000L)
    public void emitirLembretesPendentes() {
        var agora = Regra.agora();
        var janela = agora.plusHours(2);
        var proximos = agenda.findByStatusInAndInicioGreaterThanAndInicioLessThanEqual(
                List.of(Status.RESERVADO, Status.CONFIRMADO), agora, janela);
        emitirLembretesPara(proximos);
    }

    private void emitirLembretesDoCliente(Long clienteId) {
        var agora = Regra.agora();
        var janela = agora.plusHours(2);
        var proximos = agenda.findByClienteIdAndStatusInAndInicioGreaterThanAndInicioLessThanEqual(
                clienteId, List.of(Status.RESERVADO, Status.CONFIRMADO), agora, janela);
        emitirLembretesPara(proximos);
    }

    private void emitirLembretesPara(List<Agendamento> proximos) {
        for (Agendamento a : proximos) {
            String horario = DATA_HORA_FMT.format(a.inicio);
            registrar(a.cliente, Tipo.LEMBRETE, "Lembrete de horário",
                    "Seu atendimento de " + a.nomeServico + " com " + a.barbeiro.getNome() + " é em " + horario + ".",
                    "/meus-horarios", "LEMBRETE:" + a.id + ":" + a.inicio);
        }
    }

    private void registrar(Usuario dest, Tipo tipo, String titulo, String mensagem, String destinoUrl, String chaveUnica) {
        if (dest == null || !dest.isAtivo()) return;
        if (tipo == Tipo.LEMBRETE && !dest.isNotifLembretes()) return;
        if (tipo == Tipo.RECOMPENSA_FIDELIDADE && !dest.isNotifFidelidade()) return;
        if (notificacoes.existsByChaveUnica(chaveUnica)) return;
        if (chavesProcessadas.size() > 4096) chavesProcessadas.clear();
        if (chavesProcessadas.putIfAbsent(chaveUnica, Boolean.TRUE) != null) return;

        final Long destId = dest.getId();
        final boolean enviarSistema = dest.isNotifSistema();
        final boolean enviarPush = dest.isNotifPush();

        View salvoView = null;
        if (enviarSistema) {
            var n = new Notificacao();
            n.destinatario = dest;
            n.tipo = tipo;
            n.titulo = titulo;
            n.mensagem = mensagem;
            n.destinoUrl = destinoUrl;
            n.chaveUnica = chaveUnica;
            n.criadaEm = Regra.agora();
            notificacoes.save(n);
            salvoView = view(n);
        }

        final View viewFinal = salvoView;
        final String pushJson = enviarPush ? serializarPush(titulo, mensagem, destinoUrl, chaveUnica) : null;
        final List<InscricaoPush> alvosPush = enviarPush ? inscricoes.findByUsuarioId(destId) : List.of();

        Runnable despachar = () -> {
            if (enviarSistema && viewFinal != null) {
                enviarSse(destId, viewFinal);
            }
            if (enviarPush && pushJson != null) {
                for (InscricaoPush sub : alvosPush) {
                    webPush.enviar(sub.endpoint, sub.p256dh, sub.auth, pushJson, this::removerEndpointExpirado);
                }
            }
        };

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    despachar.run();
                }

                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        chavesProcessadas.remove(chaveUnica);
                    }
                }
            });
        } else {
            despachar.run();
        }
    }

    private void removerEndpointExpirado(String endpoint) {
        try {
            inscricoes.removerPorEndpoint(endpoint);
        } catch (Exception ignored) { /* Limpeza assíncrona de inscrição expirada. */ }
    }

    private void enviarSse(Long usuarioId, View view) {
        var lista = emissores.get(usuarioId);
        if (lista == null || lista.isEmpty()) return;
        for (SseEmitter emitter : lista) {
            try {
                emitter.send(SseEmitter.event().name("notificacao").id(String.valueOf(view.id())).data(view));
            } catch (Exception e) {
                removerEmissor(usuarioId, emitter);
            }
        }
    }

    private String serializarPush(String titulo, String mensagem, String destinoUrl, String tag) {
        try {
            return json.writeValueAsString(Map.of(
                    "titulo", titulo,
                    "mensagem", mensagem,
                    "destinoUrl", destinoUrl,
                    "tag", tag));
        } catch (Exception e) {
            return "{}";
        }
    }

    private List<Usuario> equipeDestinatarios(Agendamento a) {
        Map<Long, Usuario> mapa = new LinkedHashMap<>();
        for (Usuario adm : usuarios.findAtivosComPapel("ADMIN")) {
            mapa.put(adm.getId(), adm);
        }
        Usuario contaBarbeiro = a.barbeiro.getUsuario();
        if (contaBarbeiro != null && contaBarbeiro.isAtivo()) {
            mapa.put(contaBarbeiro.getId(), contaBarbeiro);
        }
        mapa.remove(a.cliente.getId());
        return List.copyOf(mapa.values());
    }

    private static String primeiroNome(String nome) {
        if (nome == null || nome.isBlank()) return "Cliente";
        return nome.trim().split("\\s+")[0];
    }

    private static View view(Notificacao n) {
        return new View(n.id, n.tipo, n.titulo, n.mensagem, n.destinoUrl, n.lida, n.criadaEm);
    }
}
