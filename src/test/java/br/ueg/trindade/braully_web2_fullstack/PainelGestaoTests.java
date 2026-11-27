package br.ueg.trindade.braully_web2_fullstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade.Tipo;
import br.ueg.trindade.braully_web2_fullstack.repository.*;
import br.ueg.trindade.braully_web2_fullstack.service.Regra;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:painel_gestao_test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.demo=false",
        "app.admin-password=AdminPainel@2026",
        "jwt.secret=chave-teste-painel-gestao-000001"
})
class PainelGestaoTests {

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    @LocalServerPort
    int porta;

    @Autowired BarbeariaRepository barbearias;
    @Autowired UsuarioRepository usuarios;
    @Autowired PermissaoRepository permissoes;
    @Autowired ServicoRepository servicos;
    @Autowired BarbeiroRepository barbeiros;
    @Autowired ExpedienteRepository expedientes;
    @Autowired BloqueioRepository bloqueios;
    @Autowired AgendamentoRepository agenda;
    @Autowired MovimentoFidelidadeRepository movimentos;
    @Autowired PasswordEncoder encoder;

    record Resposta(int codigo, JsonNode corpo) {}

    @Test
    void validaCalculosPrevisibilidadeHistoricoOcupacaoComparacoesERbac() throws Exception {
        Barbearia loja = barbearias.findAll().getFirst();
        LocalDate hoje = Regra.agora().toLocalDate();

        Permissao permCliente = permissoes.findByNome("CLIENTE").orElseThrow();
        Permissao permBarbeiro = permissoes.findByNome("BARBEIRO").orElseThrow();
        Permissao permConsultarAgenda = permissoes.findByNome("AGENDAMENTOS_CONSULTAR").orElseThrow();
        Permissao permDashboard = permissoes.findByNome("DASHBOARD_ANALITICO").orElseThrow();

        Usuario cliA = criarUsuario("Cliente Alpha", "cli_alpha", "Senha@2026", permCliente, hoje.minusDays(5).atTime(10, 0));
        Usuario cliB = criarUsuario("Cliente Beta", "cli_beta", "Senha@2026", permCliente, hoje.minusDays(2).atTime(14, 0));
        Usuario usrBarb1 = criarUsuario("Barbeiro Um", "barb_um", "Senha@2026", permBarbeiro, hoje.minusDays(20).atTime(9, 0));
        Usuario usrConsAgenda = criarUsuario("Recepcao Agenda", "rec_agenda", "Senha@2026", permCliente, hoje.minusDays(10).atTime(9, 0));
        usrConsAgenda.getPermissoes().add(permConsultarAgenda);
        usuarios.save(usrConsAgenda);

        Servico corte = criarServico(loja, "Corte Teste", new BigDecimal("50.00"), 30);
        Servico barba = criarServico(loja, "Barba Teste", new BigDecimal("30.00"), 30);
        loja.premio = corte;
        loja.fidelidadeAtiva = true;
        barbearias.saveAndFlush(loja);

        Barbeiro b1 = criarBarbeiro(loja, "Profissional Um", usrBarb1, true);
        Barbeiro b2 = criarBarbeiro(loja, "Profissional Dois", null, true);

        // Expediente somente de segunda a sexta 09:00-12:00 (180 min/dia por profissional); sábado/domingo fechados
        for (DayOfWeek dow : List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)) {
            criarExpediente(loja, null, dow, LocalTime.of(9, 0), LocalTime.of(12, 0));
            criarExpediente(loja, b1, dow, LocalTime.of(9, 0), LocalTime.of(12, 0));
            criarExpediente(loja, b2, dow, LocalTime.of(9, 0), LocalTime.of(12, 0));
        }

        // Janela determinística em semana fechada anterior (Segunda a Sexta = 5 dias úteis x 2 prof x 180min = 1800min base)
        LocalDate segPassada = hoje.with(DayOfWeek.MONDAY).minusWeeks(1);
        LocalDate sexPassada = segPassada.plusDays(4);
        LocalDate domPassado = segPassada.plusDays(6);

        // Bloqueio de 60 minutos para Profissional Um na terça passada (10:00-11:00) -> capacidade líquida vira 1800 - 60 = 1740 min
        Bloqueio bloq = new Bloqueio();
        bloq.barbearia = loja;
        bloq.barbeiro = b1;
        bloq.inicio = segPassada.plusDays(1).atTime(10, 0);
        bloq.fim = segPassada.plusDays(1).atTime(11, 0);
        bloq.motivo = "Manutenção";
        bloqueios.save(bloq);

        // Agendamentos da semana passada:
        // 1) Segunda 09:00-09:30 b1, cliA, CONCLUIDO pago R$ 50,00 (preço histórico!)
        criarAgendamento(cliA, b1, corte, segPassada.atTime(9, 0), Status.CONCLUIDO, false, new BigDecimal("50.00"));
        // 2) Quarta 09:00-09:30 b1, cliA, CONCLUIDO pago R$ 30,00 (cliA torna-se recorrente: 2 concluídos)
        criarAgendamento(cliA, b1, barba, segPassada.plusDays(2).atTime(9, 0), Status.CONCLUIDO, false, new BigDecimal("30.00"));
        // 3) Quinta 09:00-09:30 b2, cliB, CONCLUIDO fidelidade benefício R$ 0,00
        Agendamento agPremio = criarAgendamento(cliB, b2, corte, segPassada.plusDays(3).atTime(9, 0), Status.CONCLUIDO, true, BigDecimal.ZERO);
        // 4) Sexta 09:00-09:30 b2, cliB, CONFIRMADO R$ 50,00 (ocupa agenda + entra em valor previsto)
        criarAgendamento(cliB, b2, corte, sexPassada.atTime(9, 0), Status.CONFIRMADO, false, new BigDecimal("50.00"));
        // 5) Sexta 10:00-10:30 b2, cliB, RESERVADO R$ 30,00 (ocupa agenda + entra em valor previsto)
        criarAgendamento(cliB, b2, barba, sexPassada.atTime(10, 0), Status.RESERVADO, false, new BigDecimal("30.00"));
        // 6) Sexta 11:00-11:30 b1, cliA, CANCELADO R$ 50,00 (NÃO ocupa agenda nem soma valor)
        criarAgendamento(cliA, b1, corte, sexPassada.atTime(11, 0), Status.CANCELADO, false, new BigDecimal("50.00"));
        // 7) Quinta 11:00-11:30 b1, cliB, FALTOU R$ 30,00 (NÃO ocupa agenda nem soma valor)
        criarAgendamento(cliB, b1, barba, segPassada.plusDays(3).atTime(11, 0), Status.FALTOU, false, new BigDecimal("30.00"));

        // Movimento de fidelidade na semana passada
        MovimentoFidelidade mCred = new MovimentoFidelidade();
        mCred.cliente = cliA;
        mCred.tipo = Tipo.CREDITO;
        mCred.quantidade = 1;
        mCred.criadoEm = segPassada.atTime(9, 30);
        movimentos.save(mCred);

        MovimentoFidelidade mRecomp = new MovimentoFidelidade();
        mRecomp.cliente = cliB;
        mRecomp.tipo = Tipo.RECOMPENSA;
        mRecomp.quantidade = 10;
        mRecomp.premio = corte;
        mRecomp.nomePremio = corte.nome;
        mRecomp.agendamento = agPremio;
        mRecomp.criadoEm = segPassada.atTime(10, 0);
        mRecomp.resgatadoEm = segPassada.plusDays(3).atTime(9, 30);
        movimentos.save(mRecomp);

        // Alteração posterior de preço no catálogo NÃO deve distorcer valor histórico concluído
        corte.preco = new BigDecimal("99.00");
        servicos.save(corte);

        // Valida RBAC antes das asserções numéricas
        String admin = token("admin", "AdminPainel@2026");
        String tokBarb = token("barb_um", "Senha@2026");
        String tokCli = token("cli_alpha", "Senha@2026");
        String tokRec = token("rec_agenda", "Senha@2026");

        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokBarb, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokCli, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokRec, null).codigo()).isEqualTo(403);

        // Concede DASHBOARD_ANALITICO ao usuário recepção e depois revoga
        var atb = req("PUT", "/usuarios/" + usrConsAgenda.getId() + "/permissoes", admin,
                List.of(permCliente.getId(), permConsultarAgenda.getId(), permDashboard.getId()));
        assertThat(atb.codigo()).isEqualTo(200);
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokRec, null).codigo()).isEqualTo(401);
        String tokRecDash = token("rec_agenda", "Senha@2026");
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokRecDash, null).codigo()).isEqualTo(200);
        assertThat(req("PUT", "/usuarios/" + usrConsAgenda.getId() + "/permissoes", admin,
                List.of(permCliente.getId(), permConsultarAgenda.getId())).codigo()).isEqualTo(200);
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokRecDash, null).codigo()).isEqualTo(401);
        String tokRecSem = token("rec_agenda", "Senha@2026");
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokRecSem, null).codigo()).isEqualTo(403);

        // Consulta determinística da janela segPassada..domPassado
        var resp = req("GET", "/painel/resumo?periodo=PERSONALIZADO&inicio=" + segPassada + "&fim=" + domPassado, admin, null);
        assertThat(resp.codigo()).isEqualTo(200);
        JsonNode corpo = resp.corpo();
        JsonNode ind = corpo.path("indicadores");

        assertThat(ind.path("totalAgendamentos").asLong()).isEqualTo(7);
        assertThat(ind.path("concluidos").asLong()).isEqualTo(3);
        assertThat(ind.path("concluidosPagos").asLong()).isEqualTo(2);
        assertThat(ind.path("concluidosBeneficio").asLong()).isEqualTo(1);
        assertThat(ind.path("confirmados").asLong()).isEqualTo(1);
        assertThat(ind.path("pendentes").asLong()).isEqualTo(1);
        assertThat(ind.path("cancelados").asLong()).isEqualTo(1);
        assertThat(ind.path("faltas").asLong()).isEqualTo(1);

        // Histórico preservado: 50.00 + 30.00 = 80.00 (não 99.00), previsto = 50.00 + 30.00 = 80.00, ticket médio = 80.00 / 2 = 40.00
        assertThat(ind.path("valorServicosConcluidos").decimalValue()).isEqualByComparingTo("80.00");
        assertThat(ind.path("valorPrevistoAgendamentos").decimalValue()).isEqualByComparingTo("80.00");
        assertThat(ind.path("ticketMedioConcluidos").decimalValue()).isEqualByComparingTo("40.00");

        // Clientes únicos concluídos: cliA e cliB = 2; recorrente (>=2 concluídos): cliA = 1; primeiros atendimentos: 2
        assertThat(ind.path("clientesUnicosAtendidos").asLong()).isEqualTo(2);
        assertThat(ind.path("clientesRecorrentes").asLong()).isEqualTo(1);
        assertThat(ind.path("primeirosAtendimentos").asLong()).isEqualTo(2);

        // Ocupação: 5 agendamentos que ocupam agenda x 30min = 150 min; disponíveis = 1740 min; bloqueados = 60 min
        assertThat(ind.path("minutosOcupados").asLong()).isEqualTo(150);
        assertThat(ind.path("minutosDisponiveis").asLong()).isEqualTo(1740);
        assertThat(ind.path("minutosBloqueados").asLong()).isEqualTo(60);
        assertThat(ind.path("ocupacaoEstimadaHistorica").asBoolean()).isTrue();
        // 150 * 100 / 1740 = 8.6%
        assertThat(ind.path("ocupacaoPercentual").decimalValue()).isEqualByComparingTo("8.6");

        // Denominador zero no período anterior -> comparavel = false e deltaPercentual = null
        assertThat(ind.path("compValorConcluidos").path("comparavel").asBoolean()).isFalse();
        assertThat(ind.path("compValorConcluidos").path("deltaPercentual").isNull()).isTrue();

        // Ranking de serviços retorna nomes preenchidos mesmo quando Barbearia.premio aponta para o serviço (proxy Hibernate)
        assertThat(corpo.path("rankingServicos").size()).isEqualTo(2);
        for (JsonNode sRank : corpo.path("rankingServicos")) {
            assertThat(sRank.path("nome").asText()).isNotBlank();
        }

        // Fidelidade no período
        JsonNode fid = corpo.path("fidelidadeClientes");
        assertThat(fid.path("creditosEmitidosNoPeriodo").asLong()).isEqualTo(1);
        assertThat(fid.path("recompensasLiberadasNoPeriodo").asLong()).isEqualTo(1);
        assertThat(fid.path("recompensasResgatadasNoPeriodo").asLong()).isEqualTo(1);

        // Matriz de demanda distingue sábado/domingo FECHADO da semana útil aberta
        boolean achouSabadoFechado = false;
        boolean achouSegundaAberta = false;
        for (JsonNode cel : corpo.path("mapaDemanda")) {
            if ("SATURDAY".equals(cel.path("diaSemana").asText())) {
                assertThat(cel.path("nivel").asText()).isEqualTo("FECHADO");
                achouSabadoFechado = true;
            }
            if ("MONDAY".equals(cel.path("diaSemana").asText()) && cel.path("horaInicio").asInt() == 8) {
                assertThat(cel.path("nivel").asText()).isNotEqualTo("FECHADO");
                assertThat(cel.path("atendimentos").asLong()).isEqualTo(1);
                achouSegundaAberta = true;
            }
        }
        assertThat(achouSabadoFechado).isTrue();
        assertThat(achouSegundaAberta).isTrue();

        // Filtro por Profissional Um (b1): disponíveis = 900 - 60 = 840 min; ocupados = 2x30 = 60 min; valor concluído = 80.00
        var respBarb = req("GET", "/painel/resumo?periodo=PERSONALIZADO&inicio=" + segPassada + "&fim=" + domPassado
                + "&barbeiroId=" + b1.getId(), admin, null);
        assertThat(respBarb.codigo()).isEqualTo(200);
        JsonNode indB1 = respBarb.corpo().path("indicadores");
        assertThat(indB1.path("totalAgendamentos").asLong()).isEqualTo(4);
        assertThat(indB1.path("concluidos").asLong()).isEqualTo(2);
        assertThat(indB1.path("minutosDisponiveis").asLong()).isEqualTo(840);
        assertThat(indB1.path("minutosBloqueados").asLong()).isEqualTo(60);
        assertThat(indB1.path("minutosOcupados").asLong()).isEqualTo(60);
        assertThat(indB1.path("valorServicosConcluidos").decimalValue()).isEqualByComparingTo("80.00");

        // Período vazio distante: zeros reais e ratios null
        LocalDate futuroVazio = hoje.plusMonths(6);
        var respVazio = req("GET", "/painel/resumo?periodo=PERSONALIZADO&inicio=" + futuroVazio + "&fim=" + futuroVazio.plusDays(4), admin, null);
        assertThat(respVazio.codigo()).isEqualTo(200);
        assertThat(respVazio.corpo().path("indicadores").path("totalAgendamentos").asLong()).isZero();
        assertThat(respVazio.corpo().path("indicadores").path("ticketMedioConcluidos").isNull()).isTrue();
        assertThat(respVazio.corpo().path("indicadores").path("taxaComparecimento").isNull()).isTrue();

        // Período ESTE_MES verifica corte equivalente quando mês em andamento
        var respMes = req("GET", "/painel/resumo?periodo=ESTE_MES", admin, null);
        assertThat(respMes.codigo()).isEqualTo(200);
        boolean mesIncompletoEsperado = hoje.isBefore(hoje.withDayOfMonth(hoje.lengthOfMonth()));
        assertThat(respMes.corpo().path("contexto").path("periodoIncompleto").asBoolean()).isEqualTo(mesIncompletoEsperado);
        assertThat(respMes.corpo().path("contexto").path("fusoHorario").asText()).isEqualTo("America/Sao_Paulo");

        // Validação de parâmetros inválidos -> HTTP 400
        assertThat(req("GET", "/painel/resumo?periodo=PERSONALIZADO&inicio=" + hoje + "&fim=" + hoje.minusDays(1), admin, null).codigo())
                .isEqualTo(400);
    }

    private Usuario criarUsuario(String nome, String username, String senha, Permissao p, LocalDateTime criadoEm) {
        Usuario u = new Usuario(nome, username, encoder.encode(senha), username + "@teste.local");
        u.setCriadoEm(criadoEm);
        u.getPermissoes().add(p);
        return usuarios.save(u);
    }

    private Servico criarServico(Barbearia loja, String nome, BigDecimal preco, int duracao) {
        Servico s = new Servico();
        s.barbearia = loja;
        s.nome = nome;
        s.preco = preco;
        s.duracaoMinutos = duracao;
        s.elegivel = true;
        s.ativo = true;
        return servicos.save(s);
    }

    private Barbeiro criarBarbeiro(Barbearia loja, String nome, Usuario conta, boolean ativo) {
        Barbeiro b = new Barbeiro();
        b.barbearia = loja;
        b.nome = nome;
        b.usuario = conta;
        b.ativo = ativo;
        return barbeiros.save(b);
    }

    private void criarExpediente(Barbearia loja, Barbeiro b, DayOfWeek dia, LocalTime ini, LocalTime fim) {
        Expediente e = new Expediente();
        e.barbearia = loja;
        e.barbeiro = b;
        e.dia = dia;
        e.inicio = ini;
        e.fim = fim;
        expedientes.save(e);
    }

    private Agendamento criarAgendamento(Usuario cli, Barbeiro b, Servico s, LocalDateTime ini,
                                         Status status, boolean beneficio, BigDecimal preco) {
        Agendamento a = new Agendamento();
        a.cliente = cli;
        a.barbeiro = b;
        a.servico = s;
        a.nomeServico = s.nome;
        a.inicio = ini;
        a.fim = ini.plusMinutes(s.duracaoMinutos);
        a.status = status;
        a.beneficio = beneficio;
        a.elegivelNaReserva = s.elegivel;
        a.preco = preco;
        return agenda.save(a);
    }

    private String token(String usuario, String senha) throws Exception {
        var r = req("POST", "/login", null, Map.of("username", usuario, "senha", senha));
        assertThat(r.codigo()).isEqualTo(200);
        return r.corpo().path("token").asText();
    }

    private Resposta req(String metodo, String url, String token, Object corpo) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + porta + "/api" + url))
                .timeout(java.time.Duration.ofSeconds(20));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        HttpRequest req = corpo == null
                ? builder.method(metodo, HttpRequest.BodyPublishers.noBody()).build()
                : builder.header("Content-Type", "application/json")
                        .method(metodo, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(corpo))).build();
        var r = http.send(req, HttpResponse.BodyHandlers.ofString());
        return new Resposta(r.statusCode(), r.body().isBlank() ? null : json.readTree(r.body()));
    }
}
