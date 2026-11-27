package br.ueg.trindade.braully_web2_fullstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.model.MovimentoFidelidade.Tipo;
import br.ueg.trindade.braully_web2_fullstack.repository.*;
import br.ueg.trindade.braully_web2_fullstack.service.Regra;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:inteligencia_negocio_test;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.demo=false",
        "app.admin-password=AdminInteligencia@2026",
        "jwt.secret=chave-teste-inteligencia-negocio-0001"
})
class InteligenciaNegocioTests {

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

    record Resposta(int codigo, String bruto, JsonNode corpo) {}

    @Test
    void validaInsightsRetencaoMetasOcupacaoERbac() throws Exception {
        Barbearia loja = barbearias.findAll().getFirst();
        LocalDate hoje = Regra.agora().toLocalDate();

        Permissao permCliente = permissoes.findByNome("CLIENTE").orElseThrow();
        Permissao permBarbeiro = permissoes.findByNome("BARBEIRO").orElseThrow();
        Permissao permDashboard = permissoes.findByNome("DASHBOARD_ANALITICO").orElseThrow();
        Permissao permMetas = permissoes.findByNome("METAS_GERENCIAR").orElseThrow();
        Permissao permClientes = permissoes.findByNome("CLIENTES_GERENCIAR").orElseThrow();

        Usuario usrBarb1 = criarUsuario("Barbeiro Analise", "barb_intel", "Senha@2026", permBarbeiro, hoje.minusDays(60).atTime(9, 0));
        Usuario usrDashOnly = criarUsuario("Analista Somente Leitura", "dash_only", "Senha@2026", permCliente, hoje.minusDays(20).atTime(9, 0));
        usrDashOnly.getPermissoes().add(permDashboard);
        usuarios.save(usrDashOnly);

        Usuario usrGestorMetas = criarUsuario("Gestor Metas", "gestor_metas", "Senha@2026", permCliente, hoje.minusDays(20).atTime(9, 0));
        usrGestorMetas.getPermissoes().add(permDashboard);
        usrGestorMetas.getPermissoes().add(permMetas);
        usuarios.save(usrGestorMetas);

        Usuario usrClientesOnly = criarUsuario("Gestor Clientes", "gestor_cli", "Senha@2026", permCliente, hoje.minusDays(20).atTime(9, 0));
        usrClientesOnly.getPermissoes().add(permClientes);
        usuarios.save(usrClientesOnly);

        // 6 clientes cobrindo todas as classificações de retenção
        Usuario cliAtrasado = criarUsuario("Carlos Atrasado", "carlos_atr", "Senha@2026", permCliente, hoje.minusDays(60).atTime(10, 0));
        Usuario cliFuturo = criarUsuario("Bruno Futuro", "bruno_fut", "Senha@2026", permCliente, hoje.minusDays(60).atTime(10, 0));
        Usuario cliEsperado = criarUsuario("Diego Esperado", "diego_esp", "Senha@2026", permCliente, hoje.minusDays(45).atTime(10, 0));
        Usuario cliRecorrente = criarUsuario("Eduardo Recorrente", "edu_rec", "Senha@2026", permCliente, hoje.minusDays(40).atTime(10, 0));
        Usuario cliNovo = criarUsuario("Felipe Novo", "felipe_novo", "Senha@2026", permCliente, hoje.minusDays(15).atTime(10, 0));
        Usuario cliInsuficiente = criarUsuario("Gustavo Novo Sem Visita", "gustavo_zero", "Senha@2026", permCliente, hoje.minusDays(3).atTime(10, 0));

        Servico corte = criarServico(loja, "Corte Editorial", new BigDecimal("60.00"), 30);
        Servico barba = criarServico(loja, "Barba Navalha", new BigDecimal("30.00"), 30);
        loja.premio = corte;
        loja.fidelidadeAtiva = true;
        loja.meta = 5;
        barbearias.saveAndFlush(loja);

        Barbeiro b1 = criarBarbeiro(loja, "Profissional Alfa", usrBarb1, true);
        Barbeiro b2 = criarBarbeiro(loja, "Profissional Beta", null, true);

        // Expediente Seg–Sex 09:00–12:00 (diverge propositalmente da referência Seg–Sáb 08:00–21:00)
        for (DayOfWeek dow : List.of(DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY)) {
            criarExpediente(loja, null, dow, LocalTime.of(9, 0), LocalTime.of(12, 0));
            criarExpediente(loja, b1, dow, LocalTime.of(9, 0), LocalTime.of(12, 0));
            criarExpediente(loja, b2, dow, LocalTime.of(9, 0), LocalTime.of(12, 0));
        }

        String tokAdmin = token("admin", "AdminInteligencia@2026");

        // 1. Janela vazia -> fallback honesto DADOS_INSUFICIENTES + aviso de expediente
        LocalDate vaziaIni = hoje.minusWeeks(8).with(DayOfWeek.MONDAY);
        LocalDate vaziaFim = vaziaIni.plusDays(6);
        var respVazia = req("GET", "/painel/resumo?periodo=PERSONALIZADO&inicio=" + vaziaIni + "&fim=" + vaziaFim, tokAdmin, null);
        assertThat(respVazia.codigo()).isEqualTo(200);
        List<String> idsVazio = idsInsights(respVazia.corpo());
        assertThat(idsVazio).contains("DADOS_INSUFICIENTES", "CONFIG_EXPEDIENTE_REFERENCIA");
        assertThat(idsVazio).doesNotContain("AGENDA_PICO_DEMANDA", "SERVICO_LIDER_DEMANDA", "CANCELAMENTOS_ELEVADOS");
        assertThat(respVazia.corpo().path("metaMes").path("configurada").asBoolean()).isFalse();

        // 2. Popula histórico de retenção fora da janela de análise abaixo (que usa minusWeeks(2))
        // Carlos Atrasado: 50d, 38d, 26d atrás -> mediana = 12d, limite = max(19, 16) = 19d, diasDesde = 26 -> RETORNO_ATRASADO
        criarAgendamento(cliAtrasado, b1, corte, hoje.minusDays(50).atTime(9, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamento(cliAtrasado, b1, corte, hoje.minusDays(38).atTime(9, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamento(cliAtrasado, b1, corte, hoje.minusDays(26).atTime(9, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));

        // Bruno Futuro: mesmo padrão atrasado + agendamento futuro -> AGENDAMENTO_FUTURO
        criarAgendamento(cliFuturo, b1, barba, hoje.minusDays(50).atTime(10, 0), Status.CONCLUIDO, false, new BigDecimal("30.00"));
        criarAgendamento(cliFuturo, b1, barba, hoje.minusDays(38).atTime(10, 0), Status.CONCLUIDO, false, new BigDecimal("30.00"));
        criarAgendamento(cliFuturo, b1, barba, hoje.minusDays(26).atTime(10, 0), Status.CONCLUIDO, false, new BigDecimal("30.00"));
        criarAgendamento(cliFuturo, b2, barba, hoje.plusDays(3).atTime(10, 0), Status.RESERVADO, false, new BigDecimal("30.00"));

        // Diego Esperado: 45d, 26d, 7d atrás -> mediana = 19d, limite = 26d, diasDesde = 7 -> RETORNO_ESPERADO
        criarAgendamento(cliEsperado, b2, corte, hoje.minusDays(45).atTime(11, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamento(cliEsperado, b2, corte, hoje.minusDays(26).atTime(11, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamento(cliEsperado, b2, corte, hoje.minusDays(7).atTime(11, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));

        // Eduardo Recorrente: 2 concluídos (26d e 7d atrás) -> CLIENTE_RECORRENTE
        criarAgendamento(cliRecorrente, b2, corte, hoje.minusDays(26).atTime(9, 30), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamento(cliRecorrente, b2, corte, hoje.minusDays(7).atTime(9, 30), Status.CONCLUIDO, false, new BigDecimal("60.00"));

        // Felipe Novo: 0 anteriores -> apenas o da segunda na semana fechada torna-o CLIENTE_NOVO (1 concluído total!)
        // Deixar cliNovo com 0 aqui para que a segunda fechada dê exatamente 1 concluído (CLIENTE_NOVO).

        // 3. Janela determinística há 2 semanas fechadas (segRetrasada..domRetrasado):
        //    - Sobreposição de horários em b1 para testar intervalo unificado (não dupla contagem!)
        //    - Cancelamentos elevados (>=20% com >=5 agendamentos), SEM faltas ainda
        LocalDate segPassada = hoje.with(DayOfWeek.MONDAY).minusWeeks(2);
        LocalDate domPassado = segPassada.plusDays(6);

        // Bloqueio 60 min em b1 -> capacidade semanal 1800 - 60 = 1740 min
        Bloqueio bloq = new Bloqueio();
        bloq.barbearia = loja;
        bloq.barbeiro = b1;
        bloq.inicio = segPassada.plusDays(1).atTime(10, 0);
        bloq.fim = segPassada.plusDays(1).atTime(11, 0);
        bloq.motivo = "Manutenção";
        bloqueios.save(bloq);

        // b1 terça 09:00-10:00 (60m) e 09:30-10:30 (60m, sendo metade fora/sobreposto ao bloqueio? Não: 09:30-10:00 + bloqueio 10:00-11:00; use 09:00-09:45 e 09:15-10:00 na segunda!)
        // Segunda em b1: 09:00-09:45 e 09:15-10:00 -> união = 60 min (não 90 min!)
        criarAgendamentoCustom(cliNovo, b1, corte, segPassada.atTime(9, 0), segPassada.atTime(9, 45), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamentoCustom(cliEsperado, b1, corte, segPassada.atTime(9, 15), segPassada.atTime(10, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        // Mais 3 concluídos em dias diferentes (total concluídos = 5 -> 60m unificados + 3x30m = 150m)
        criarAgendamento(cliEsperado, b1, corte, segPassada.plusDays(2).atTime(9, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamento(cliEsperado, b2, corte, segPassada.plusDays(2).atTime(10, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamento(cliEsperado, b2, barba, segPassada.plusDays(3).atTime(9, 0), Status.CONCLUIDO, false, new BigDecimal("30.00"));
        // 2 CANCELADO na mesma semana -> 2/7 = 28.6% cancelamentos (>= 20%), 0 faltas -> CANCELAMENTOS_ELEVADOS sim, FALTAS_ELEVADAS não!
        Agendamento agCanc1 = criarAgendamento(cliNovo, b2, barba, segPassada.plusDays(4).atTime(9, 0), Status.CANCELADO, false, new BigDecimal("30.00"));
        Agendamento agCanc2 = criarAgendamento(cliEsperado, b2, barba, segPassada.plusDays(4).atTime(10, 0), Status.CANCELADO, false, new BigDecimal("30.00"));

        // Altera preço do Corte após registros históricos -> valorPorHora histórico permanece R$ 120.00/h (60 / 0.5h)
        corte.preco = new BigDecimal("110.00");
        servicos.save(corte);

        // Fidelidade: cliente perto da meta (4/5 selos) + 1 recompensa livre
        MovimentoFidelidade mNear = new MovimentoFidelidade();
        mNear.cliente = cliNovo;
        mNear.tipo = Tipo.CREDITO;
        mNear.quantidade = 4;
        mNear.criadoEm = segPassada.atTime(12, 0);
        movimentos.save(mNear);

        MovimentoFidelidade mRecomp = new MovimentoFidelidade();
        mRecomp.cliente = cliRecorrente;
        mRecomp.tipo = Tipo.RECOMPENSA;
        mRecomp.quantidade = 5;
        mRecomp.premio = corte;
        mRecomp.nomePremio = corte.nome;
        mRecomp.criadoEm = segPassada.plusDays(1).atTime(12, 0);
        movimentos.save(mRecomp);

        var respSemana = req("GET", "/painel/resumo?periodo=PERSONALIZADO&inicio=" + segPassada + "&fim=" + domPassado, tokAdmin, null);
        assertThat(respSemana.codigo()).isEqualTo(200);
        JsonNode corpoSem = respSemana.corpo();

        // Sobreposição unificada: 60 min (segunda b1) + 30 + 30 + 30 = 150 min (não 180)
        assertThat(corpoSem.path("indicadores").path("minutosOcupados").asLong()).isEqualTo(150);
        assertThat(corpoSem.path("indicadores").path("minutosDisponiveis").asLong()).isEqualTo(1740);

        List<String> idsSem = idsInsights(corpoSem);
        assertThat(idsSem).contains(
                "CANCELAMENTOS_ELEVADOS",
                "CLIENTES_RETORNO_ATRASADO",
                "AGENDA_BAIXA_OCUPACAO",
                "FIDELIDADE_RECOMPENSAS_DISPONIVEIS",
                "SERVICO_LIDER_DEMANDA",
                "CONFIG_EXPEDIENTE_REFERENCIA"
        );
        assertThat(idsSem).doesNotContain("FALTAS_ELEVADAS");

        // Valor/hora de "Corte Editorial": 4 concluídos pagos = R$ 240,00 em 2,5h? Não: 2 custom de 45m = 90m + 2 de 30m = 60m => 150m (2,5h)!
        // 240.00 / 2.5h = 96.00/h! Verificando cálculo exato de duração real registrada!
        JsonNode corteRank = null;
        for (JsonNode item : corpoSem.path("rankingServicos")) {
            if ("Corte Editorial".equals(item.path("nome").asText())) corteRank = item;
        }
        assertThat(corteRank).isNotNull();
        assertThat(corteRank.path("valorConcluidos").decimalValue()).isEqualByComparingTo("240.00");
        assertThat(corteRank.path("valorPorHora").decimalValue()).isEqualByComparingTo("96.00");

        // Mutação dinâmica dos dados: converte os 2 cancelados em 2 FALTOU -> insight muda de CANCELAMENTOS_ELEVADOS para FALTAS_ELEVADAS
        agCanc1.status = Status.FALTOU;
        agCanc2.status = Status.FALTOU;
        agenda.saveAllAndFlush(List.of(agCanc1, agCanc2));

        var respFaltas = req("GET", "/painel/resumo?periodo=PERSONALIZADO&inicio=" + segPassada + "&fim=" + domPassado, tokAdmin, null);
        assertThat(respFaltas.codigo()).isEqualTo(200);
        List<String> idsFaltas = idsInsights(respFaltas.corpo());
        assertThat(idsFaltas).contains("FALTAS_ELEVADAS");
        assertThat(idsFaltas).doesNotContain("CANCELAMENTOS_ELEVADOS");

        // 4. Retenção de clientes (/clientes/retencao) - todas as 6 categorias, filtros, ordenação e detalhe individual
        var respRet = req("GET", "/clientes/retencao?ordenar=ATRASO", tokAdmin, null);
        assertThat(respRet.codigo()).isEqualTo(200);
        JsonNode contadores = respRet.corpo().path("resumo");
        assertThat(contadores.path("atrasados").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(contadores.path("agendamentoFuturo").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(contadores.path("retornoEsperado").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(contadores.path("recorrentes").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(contadores.path("novos").asLong()).isGreaterThanOrEqualTo(1);
        assertThat(contadores.path("historicoInsuficiente").asLong()).isGreaterThanOrEqualTo(1);

        assertStatusCliente(cliAtrasado.getId(), "RETORNO_ATRASADO", tokAdmin);
        assertStatusCliente(cliFuturo.getId(), "AGENDAMENTO_FUTURO", tokAdmin);
        assertStatusCliente(cliEsperado.getId(), "RETORNO_ESPERADO", tokAdmin);
        assertStatusCliente(cliRecorrente.getId(), "CLIENTE_RECORRENTE", tokAdmin);
        assertStatusCliente(cliNovo.getId(), "CLIENTE_NOVO", tokAdmin);
        assertStatusCliente(cliInsuficiente.getId(), "HISTORICO_INSUFICIENTE", tokAdmin);

        var respFiltroAtr = req("GET", "/clientes/retencao?status=RETORNO_ATRASADO&busca=Carlos", tokAdmin, null);
        assertThat(respFiltroAtr.codigo()).isEqualTo(200);
        assertThat(respFiltroAtr.corpo().path("clientes").size()).isEqualTo(1);
        assertThat(respFiltroAtr.corpo().path("clientes").get(0).path("servicoMaisFrequente").asText()).isEqualTo("Corte Editorial");

        // 5. Metas mensais: validação 400, preservação histórica por mês, >100%, resumo narrativo e exclusão
        YearMonth mesAtual = YearMonth.from(hoje);
        YearMonth mesPassado = mesAtual.minusMonths(1);

        assertThat(req("PUT", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokAdmin,
                Map.of("metaAtendimentosConcluidos", 0)).codigo()).isEqualTo(400);
        assertThat(req("PUT", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokAdmin,
                Map.of("metaOcupacaoPercentual", 120)).codigo()).isEqualTo(400);

        // Cria histórico preservado em mês anterior diferente do mês atual
        var putMesPassado = req("PUT", "/metas/" + mesPassado.getYear() + "/" + mesPassado.getMonthValue(), tokAdmin,
                Map.of("metaAtendimentosConcluidos", 99));
        assertThat(putMesPassado.codigo()).isEqualTo(200);

        // Cria atendimento concluído hoje para que o mês atual ultrapasse meta=1 (>= 100% / >100%)
        criarAgendamento(cliAtrasado, b1, corte, hoje.atTime(9, 0), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        criarAgendamento(cliEsperado, b2, corte, hoje.atTime(9, 30), Status.CONCLUIDO, false, new BigDecimal("60.00"));
        var putMesAtual = req("PUT", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokAdmin,
                Map.of("metaAtendimentosConcluidos", 1, "metaValorConcluidos", 50.00));
        assertThat(putMesAtual.codigo()).isEqualTo(200);
        assertThat(putMesAtual.corpo().path("configurada").asBoolean()).isTrue();
        assertThat(putMesAtual.corpo().path("diasOperacionaisTotais").asInt()).isGreaterThan(0);
        JsonNode primeiroItemMeta = putMesAtual.corpo().path("itens").get(0);
        assertThat(primeiroItemMeta.path("atingida").asBoolean()).isTrue();
        assertThat(primeiroItemMeta.path("percentualAtingido").decimalValue()).isGreaterThanOrEqualTo(new BigDecimal("200.0"));

        // Mês anterior preservado intacto!
        var getMesPassado = req("GET", "/metas/" + mesPassado.getYear() + "/" + mesPassado.getMonthValue(), tokAdmin, null);
        assertThat(getMesPassado.codigo()).isEqualTo(200);
        assertThat(getMesPassado.corpo().path("itens").get(0).path("meta").decimalValue()).isEqualByComparingTo("99");

        // Painel atual inclui META_MENSAL_ATINGIDA e resumo narrativo coerente
        var respAtual = req("GET", "/painel/resumo?periodo=ESTE_MES", tokAdmin, null);
        assertThat(respAtual.codigo()).isEqualTo(200);
        assertThat(idsInsights(respAtual.corpo())).contains("META_MENSAL_ATINGIDA");
        assertThat(respAtual.corpo().path("resumoPeriodo").path("manchete").asText()).isNotBlank();
        assertThat(respAtual.corpo().path("resumoPeriodo").path("resumoMetas").asText()).containsIgnoringCase("meta");

        // 6. RBAC rigoroso & ausência de PII em DASHBOARD_ANALITICO
        String tokDash = token("dash_only", "Senha@2026");
        String tokGestorMetas = token("gestor_metas", "Senha@2026");
        String tokGestorCli = token("gestor_cli", "Senha@2026");
        String tokBarb = token("barb_intel", "Senha@2026");
        String tokCli = token("carlos_atr", "Senha@2026");

        var dashPainel = req("GET", "/painel/resumo?periodo=ESTE_MES", tokDash, null);
        assertThat(dashPainel.codigo()).isEqualTo(200);
        // Zero dados pessoais de clientes vazados em insights, resumo narrativo, metas ou fidelidade agregada
        for (String secao : List.of("insights", "resumoPeriodo", "metaMes", "fidelidadeClientes", "rankingServicos", "mapaDemanda")) {
            assertThat(dashPainel.corpo().path(secao).toString())
                    .doesNotContain("carlos_atr", "carlos_atr@teste.local", "Carlos Atrasado");
        }

        // DASHBOARD_ANALITICO sem CLIENTES_GERENCIAR ou METAS_GERENCIAR
        assertThat(req("GET", "/clientes/retencao", tokDash, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/clientes/retencao/" + cliAtrasado.getId(), tokDash, null).codigo()).isEqualTo(403);
        assertThat(req("PUT", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokDash,
                Map.of("metaAtendimentosConcluidos", 10)).codigo()).isEqualTo(403);
        assertThat(req("DELETE", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokDash, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/metas", tokDash, null).codigo()).isEqualTo(200);

        // Gestor com METAS_GERENCIAR salva e remove; CLIENTES_GERENCIAR somente vê retenção mas não painel nem metas
        assertThat(req("PUT", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokGestorMetas,
                Map.of("metaAtendimentosConcluidos", 15)).codigo()).isEqualTo(200);
        assertThat(req("DELETE", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokGestorMetas, null).codigo()).isEqualTo(204);

        assertThat(req("GET", "/clientes/retencao", tokGestorCli, null).codigo()).isEqualTo(200);
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokGestorCli, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/metas", tokGestorCli, null).codigo()).isEqualTo(403);

        // Barbeiro e Cliente bloqueados de painel, metas e retenção
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokBarb, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/clientes/retencao", tokBarb, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/metas", tokBarb, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/painel/resumo?periodo=ESTE_MES", tokCli, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/clientes/retencao", tokCli, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/metas", tokCli, null).codigo()).isEqualTo(403);

        // Revogação de METAS_GERENCIAR invalida token imediatamente e passa a dar 403 no novo login
        assertThat(req("PUT", "/usuarios/" + usrGestorMetas.getId() + "/permissoes", tokAdmin,
                List.of(permCliente.getId(), permDashboard.getId())).codigo()).isEqualTo(200);
        assertThat(req("PUT", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokGestorMetas,
                Map.of("metaAtendimentosConcluidos", 20)).codigo()).isEqualTo(401);
        String tokGestorRevogado = token("gestor_metas", "Senha@2026");
        assertThat(req("PUT", "/metas/" + mesAtual.getYear() + "/" + mesAtual.getMonthValue(), tokGestorRevogado,
                Map.of("metaAtendimentosConcluidos", 20)).codigo()).isEqualTo(403);
    }

    @Test
    void persisteMetasMensaisAposReinicio(@TempDir Path tmpDir) throws Exception {
        String dbUrl = "jdbc:h2:file:" + tmpDir.resolve("metas_restart").toAbsolutePath() + ";DB_CLOSE_ON_EXIT=TRUE";
        YearMonth mes = YearMonth.from(Regra.agora().toLocalDate());

        String[] argsBase = new String[]{
                "--server.port=0",
                "--spring.datasource.url=" + dbUrl,
                "--spring.jpa.hibernate.ddl-auto=update",
                "--app.demo=false",
                "--app.admin-password=AdminRestart@2026",
                "--jwt.secret=chave-teste-restart-metas-000001"
        };

        try (ConfigurableApplicationContext ctx1 = new SpringApplicationBuilder(BraullyWeb2FullstackApplication.class)
                .run(argsBase)) {
            int p1 = Integer.parseInt(ctx1.getEnvironment().getProperty("local.server.port"));
            String tok1 = tokenNaPorta(p1, "admin", "AdminRestart@2026");
            var put = reqNaPorta(p1, "PUT", "/metas/" + mes.getYear() + "/" + mes.getMonthValue(), tok1,
                    Map.of("metaAtendimentosConcluidos", 75, "metaValorConcluidos", 4200.50));
            assertThat(put.codigo()).isEqualTo(200);
        }

        try (ConfigurableApplicationContext ctx2 = new SpringApplicationBuilder(BraullyWeb2FullstackApplication.class)
                .run(argsBase)) {
            int p2 = Integer.parseInt(ctx2.getEnvironment().getProperty("local.server.port"));
            String tok2 = tokenNaPorta(p2, "admin", "AdminRestart@2026");
            var get = reqNaPorta(p2, "GET", "/metas/" + mes.getYear() + "/" + mes.getMonthValue(), tok2, null);
            assertThat(get.codigo()).isEqualTo(200);
            assertThat(get.corpo().path("configurada").asBoolean()).isTrue();
            assertThat(get.corpo().path("itens").get(0).path("meta").decimalValue()).isEqualByComparingTo("75");
            assertThat(get.corpo().path("itens").get(1).path("meta").decimalValue()).isEqualByComparingTo("4200.50");
        }
    }

    private void assertStatusCliente(Long id, String esperado, String tok) throws Exception {
        var r = req("GET", "/clientes/retencao/" + id, tok, null);
        assertThat(r.codigo()).isEqualTo(200);
        assertThat(r.corpo().path("statusRetencao").asText()).isEqualTo(esperado);
    }

    private List<String> idsInsights(JsonNode corpo) {
        return corpo.path("insights").valueStream().map(n -> n.path("id").asText()).toList();
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
        return criarAgendamentoCustom(cli, b, s, ini, ini.plusMinutes(s.duracaoMinutos), status, beneficio, preco);
    }

    private Agendamento criarAgendamentoCustom(Usuario cli, Barbeiro b, Servico s, LocalDateTime ini, LocalDateTime fim,
                                               Status status, boolean beneficio, BigDecimal preco) {
        Agendamento a = new Agendamento();
        a.cliente = cli;
        a.barbeiro = b;
        a.servico = s;
        a.nomeServico = s.nome;
        a.inicio = ini;
        a.fim = fim;
        a.status = status;
        a.beneficio = beneficio;
        a.elegivelNaReserva = s.elegivel;
        a.preco = preco;
        return agenda.save(a);
    }

    private String token(String usuario, String senha) throws Exception {
        return tokenNaPorta(porta, usuario, senha);
    }

    private String tokenNaPorta(int port, String usuario, String senha) throws Exception {
        var r = reqNaPorta(port, "POST", "/login", null, Map.of("username", usuario, "senha", senha));
        assertThat(r.codigo()).isEqualTo(200);
        return r.corpo().path("token").asText();
    }

    private Resposta req(String metodo, String url, String token, Object corpo) throws Exception {
        return reqNaPorta(porta, metodo, url, token, corpo);
    }

    private Resposta reqNaPorta(int port, String metodo, String url, String token, Object corpo) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + "/api" + url))
                .timeout(java.time.Duration.ofSeconds(20));
        if (token != null) builder.header("Authorization", "Bearer " + token);
        HttpRequest req = corpo == null
                ? builder.method(metodo, HttpRequest.BodyPublishers.noBody()).build()
                : builder.header("Content-Type", "application/json")
                        .method(metodo, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(corpo))).build();
        var r = http.send(req, HttpResponse.BodyHandlers.ofString());
        return new Resposta(r.statusCode(), r.body(), r.body().isBlank() ? null : json.readTree(r.body()));
    }
}
