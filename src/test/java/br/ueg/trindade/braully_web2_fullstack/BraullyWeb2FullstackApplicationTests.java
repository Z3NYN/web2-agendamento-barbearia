package br.ueg.trindade.braully_web2_fullstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import javax.crypto.SecretKey;

import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.repository.AgendamentoRepository;
import br.ueg.trindade.braully_web2_fullstack.repository.UsuarioRepository;
import br.ueg.trindade.braully_web2_fullstack.service.Regra;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:integracao;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "jwt.secret=chave-exclusiva-de-teste-automacao-00001"
})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class BraullyWeb2FullstackApplicationTests {
    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();
    @LocalServerPort int porta;
    @Autowired AgendamentoRepository agenda;
    @Autowired UsuarioRepository usuarios;

    record Resposta(int codigo, JsonNode corpo) {}

    @Test @Order(1)
    void autenticaAutorizaValidaTokenERevogaNoLogout() throws Exception {
        var admin = token("admin", "AdminDemo@2026");
        assertThat(req("POST", "/login", null, Map.of("username", "admin", "senha", "errada")).codigo()).isEqualTo(401);
        assertThat(req("GET", "/usuarios", null, null).codigo()).isEqualTo(401);
        assertThat(req("GET", "/usuarios", "invalido", null).codigo()).isEqualTo(401);
        assertThat(req("GET", "/usuarios", admin, null).codigo()).isEqualTo(200);
        String cliente = token("cliente", "ClienteDemo@2026");
        assertThat(req("GET", "/usuarios", cliente, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/perfil", cliente, null).corpo().has("senha")).isFalse();
        var u = usuarios.findByUsername("cliente").orElseThrow();
        SecretKey chave = Keys.hmacShaKeyFor("chave-exclusiva-de-teste-automacao-00001".getBytes(StandardCharsets.UTF_8));
        String expirado = Jwts.builder().subject(u.getId().toString()).claim("versao", u.getVersaoSessao())
                .expiration(new Date(System.currentTimeMillis() - 5000)).signWith(chave).compact();
        assertThat(req("GET", "/perfil", expirado, null).codigo()).isEqualTo(401);
        assertThat(req("POST", "/logout", cliente, null).codigo()).isEqualTo(200);
        assertThat(req("GET", "/perfil", cliente, null).codigo()).isEqualTo(401);
    }

    @Test @Order(2)
    void cadastraEditaListaEDesativaEValidaPermissao() throws Exception {
        String admin = token("admin", "AdminDemo@2026");
        assertThat(req("POST", "/servicos", admin, Map.of("nome", "")).codigo()).isEqualTo(400);
        var dados = Map.<String, Object>of("nome", "Serviço de teste", "preco", new BigDecimal("20.50"),
                "duracaoMinutos", 35, "ativo", true, "elegivel", false);
        var criado = req("POST", "/servicos", admin, dados);
        assertThat(criado.codigo()).isEqualTo(200);
        long id = criado.corpo().path("id").asLong();
        var edicao = new HashMap<>(dados);
        edicao.put("nome", "Serviço editado");
        assertThat(req("PUT", "/servicos/" + id, admin, edicao).codigo()).isEqualTo(200);
        assertThat(req("GET", "/servicos/" + id, admin, null).corpo().path("nome").asText()).isEqualTo("Serviço editado");
        assertThat(req("DELETE", "/servicos/" + id, admin, null).codigo()).isEqualTo(200);
        assertThat(req("GET", "/servicos/" + id, admin, null).corpo().path("ativo").asBoolean()).isFalse();
        assertThat(req("GET", "/publico/servicos", null, null).corpo().toString()).doesNotContain("Serviço editado");

        var p = req("POST", "/permissoes", admin, Map.of("nome", "RELATORIO", "descricao", "Teste"));
        assertThat(p.codigo()).isEqualTo(200);
        String url = "/permissoes/" + p.corpo().path("id").asLong();
        assertThat(req("GET", url, admin, null).codigo()).isEqualTo(200);
        assertThat(req("PUT", url, admin, Map.of("nome", "RELATORIO", "descricao", "Editada")).codigo()).isEqualTo(200);
        assertThat(req("DELETE", url, admin, null).codigo()).isEqualTo(200);
        assertThat(req("GET", url, admin, null).codigo()).isEqualTo(404);

        var b = req("POST", "/barbeiros", admin, Map.of("nome", "Teste profissional", "ativo", true));
        assertThat(b.codigo()).isEqualTo(200);
        String profissional = "/barbeiros/" + b.corpo().path("id").asLong();
        assertThat(req("GET", profissional, admin, null).codigo()).isEqualTo(200);
        assertThat(req("PUT", profissional, admin, Map.of("nome", "Profissional editado", "ativo", true)).codigo()).isEqualTo(200);
        assertThat(req("DELETE", profissional, admin, null).codigo()).isEqualTo(200);
        assertThat(req("GET", profissional, admin, null).corpo().path("ativo").asBoolean()).isFalse();
    }

    @Test @Order(3)
    void validaSobreposicaoBloqueioConcorrenciaReagendamentoEPropriedade() throws Exception {
        String cliente = token("cliente", "ClienteDemo@2026");
        String admin = token("admin", "AdminDemo@2026");
        long corte = idPublico("servicos", "Corte clássico");
        long rafa = idPublico("barbeiros", "Rafa Demo");
        long luiz = idPublico("barbeiros", "Luiz Demo");
        var amanha = Regra.agora().toLocalDate().plusDays(1);
        var inicio = amanha.atTime(10, 0);
        var bloqueio = req("POST", "/bloqueios", admin, Map.of("barbeiroId", rafa, "inicio", amanha.atTime(9, 0).toString(),
                "fim", amanha.atTime(9, 30).toString()));
        assertThat(bloqueio.codigo()).isEqualTo(200);
        String consulta = "/publico/horarios?servicoId=" + corte + "&barbeiroId=" + rafa + "&data=" + amanha;
        assertThat(req("GET", consulta, null, null).corpo().toString()).doesNotContain(amanha + "T09:00").contains(amanha + "T10:00");
        assertThat(req("POST", "/agendamentos", cliente, nova(corte, rafa, amanha.atTime(9, 15))).codigo()).isEqualTo(409);
        assertThat(req("POST", "/agendamentos", cliente, nova(corte, rafa, inicio.minusDays(3))).codigo()).isEqualTo(409);
        var corpo = nova(corte, rafa, inicio);
        var primeira = http.sendAsync(pedido("POST", "/agendamentos", cliente, corpo), HttpResponse.BodyHandlers.ofString());
        var segunda = http.sendAsync(pedido("POST", "/agendamentos", cliente, corpo), HttpResponse.BodyHandlers.ofString());
        var r = List.of(primeira.join(), segunda.join());
        assertThat(r.stream().map(HttpResponse::statusCode).toList()).containsExactlyInAnyOrder(200, 409);
        long id = json.readTree(r.stream().filter(x -> x.statusCode() == 200).findFirst().orElseThrow().body()).path("id").asLong();
        assertThat(req("POST", "/agendamentos", cliente, nova(corte, rafa, inicio.plusMinutes(15))).codigo()).isEqualTo(409);
        assertThat(req("GET", "/agendamentos/" + id, token("luiz", "LuizDemo@2026"), null).codigo()).isEqualTo(404);
        assertThat(req("PUT", "/agendamentos/" + id + "/status", cliente, Map.of("status", "CONCLUIDO")).codigo()).isEqualTo(403);
        assertThat(req("PUT", "/agendamentos/" + id + "/status", admin, Map.of("status", "CONCLUIDO")).codigo()).isEqualTo(409);
        var novaData = inicio.plusHours(2);
        assertThat(req("PUT", "/agendamentos/" + id, cliente, Map.of("barbeiroId", luiz, "inicio", novaData.toString()))
                .corpo().path("barbeiroId").asLong()).isEqualTo(luiz);
        assertThat(req("DELETE", "/agendamentos/" + id, cliente, null).corpo().path("status").asText()).isEqualTo("CANCELADO");
        assertThat(req("GET", "/fidelidade", cliente, null).corpo().path("progresso").asInt()).isEqualTo(9);
        assertThat(req("DELETE", "/bloqueios/" + bloqueio.corpo().path("id").asLong(), admin, null).codigo()).isEqualTo(200);
    }

    @Test @Order(4)
    void concluiEmiteReservaELiberaPremioUmaUnicaVez() throws Exception {
        String cliente = token("cliente", "ClienteDemo@2026");
        String barbeiro = token("barbeiro", "BarbeiroDemo@2026");
        long usuario = usuarios.findByUsername("cliente").orElseThrow().getId();
        var pendente = agenda.findByClienteIdOrderByInicioDesc(usuario).stream().filter(a -> a.status == Status.CONFIRMADO).findFirst().orElseThrow();
        String status = "/agendamentos/" + pendente.id + "/status";
        assertThat(req("PUT", status, barbeiro, Map.of("status", "CONCLUIDO")).codigo()).isEqualTo(200);
        assertThat(req("PUT", status, barbeiro, Map.of("status", "CONCLUIDO")).codigo()).isEqualTo(409);
        var cartao = req("GET", "/fidelidade", cliente, null).corpo();
        assertThat(cartao.path("progresso").asInt()).isZero();
        assertThat(cartao.path("historico").size()).isEqualTo(11);
        var beneficio = cartao.path("historico").get(0);
        assertThat(beneficio.path("tipo").asText()).isEqualTo("RECOMPENSA");
        long premio = beneficio.path("id").asLong();
        long corte = beneficio.path("servicoId").asLong();
        long rafa = idPublico("barbeiros", "Rafa Demo");
        var inicio = Regra.agora().toLocalDate().plusDays(2).atTime(11, 0);
        var comPremio = nova(corte, rafa, inicio);
        comPremio.put("premioId", premio);
        var reserva = req("POST", "/agendamentos", cliente, comPremio);
        assertThat(reserva.codigo()).isEqualTo(200);
        assertThat(reserva.corpo().path("preco").asDouble()).isZero();
        var id = reserva.corpo().path("id").asLong();
        comPremio.put("inicio", inicio.plusHours(1).toString());
        assertThat(req("POST", "/agendamentos", cliente, comPremio).codigo()).isEqualTo(409);
        assertThat(req("DELETE", "/agendamentos/" + id, cliente, null).codigo()).isEqualTo(200);
        var novaReserva = req("POST", "/agendamentos", cliente, comPremio);
        assertThat(novaReserva.codigo()).isEqualTo(200);
        var a = agenda.findById(novaReserva.corpo().path("id").asLong()).orElseThrow();
        assertThat(req("PUT", "/agendamentos/" + a.id + "/status", barbeiro, Map.of("status", "CONFIRMADO")).codigo()).isEqualTo(200);
        assertThat(req("PUT", "/agendamentos/" + a.id + "/status", barbeiro, Map.of("status", "CONCLUIDO")).codigo()).isEqualTo(409);
        // Posiciona a reserva no passado no banco de teste para simular a passagem do tempo.
        a = agenda.findById(a.id).orElseThrow();
        a.inicio = Regra.agora().minusHours(1);
        a.fim = a.inicio.plusMinutes(30);
        agenda.save(a);
        assertThat(req("PUT", "/agendamentos/" + a.id + "/status", barbeiro, Map.of("status", "CONCLUIDO")).codigo()).isEqualTo(200);
        assertThat(req("GET", "/fidelidade", cliente, null).corpo().path("historico").get(0).path("resgatadoEm").isNull()).isFalse();
        comPremio.put("inicio", inicio.plusHours(2).toString());
        assertThat(req("POST", "/agendamentos", cliente, comPremio).codigo()).isEqualTo(409);
    }

    private long idPublico(String lista, String nome) throws Exception {
        for (JsonNode linha : req("GET", "/publico/" + lista, null, null).corpo()) {
            if (nome.equals(linha.path("nome").asText())) return linha.path("id").asLong();
        }
        throw new AssertionError("Não encontrado: " + nome);
    }

    private HashMap<String, Object> nova(long servico, long barbeiro, LocalDateTime inicio) {
        return new HashMap<>(Map.of("servicoId", servico, "barbeiroId", barbeiro, "inicio", inicio.toString()));
    }

    private String token(String usuario, String senha) throws Exception {
        var resposta = req("POST", "/login", null, Map.of("username", usuario, "senha", senha));
        assertThat(resposta.codigo()).isEqualTo(200);
        return resposta.corpo().path("token").asText();
    }

    private HttpRequest pedido(String metodo, String url, String token, Object corpo) throws Exception {
        var req = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + "/api" + url))
                .timeout(java.time.Duration.ofSeconds(20));
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (corpo == null) return req.method(metodo, HttpRequest.BodyPublishers.noBody()).build();
        return req.header("Content-Type", "application/json")
                .method(metodo, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(corpo))).build();
    }

    private Resposta req(String metodo, String url, String token, Object corpo) throws Exception {
        var r = http.send(pedido(metodo, url, token, corpo), HttpResponse.BodyHandlers.ofString());
        return new Resposta(r.statusCode(), r.body().isBlank() ? null : json.readTree(r.body()));
    }
}
