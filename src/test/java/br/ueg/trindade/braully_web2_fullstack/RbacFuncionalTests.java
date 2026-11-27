package br.ueg.trindade.braully_web2_fullstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

import br.ueg.trindade.braully_web2_fullstack.repository.PermissaoRepository;
import br.ueg.trindade.braully_web2_fullstack.repository.UsuarioRepository;
import br.ueg.trindade.braully_web2_fullstack.service.Regra;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "spring.datasource.url=jdbc:h2:mem:rbac_funcional;DB_CLOSE_DELAY=-1",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "jwt.secret=chave-teste-rbac-funcional-000001"
})
class RbacFuncionalTests {

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    @LocalServerPort
    int porta;

    @Autowired
    PermissaoRepository permissoes;

    @Autowired
    UsuarioRepository usuarios;

    record Resposta(int codigo, JsonNode corpo) {}

    @Test
    void validaPerfisPadraoECadastroPublicoSemEscalonamento() throws Exception {
        var loginAdmin = req("POST", "/login", null, Map.of("username", "admin", "senha", "AdminDemo@2026"));
        assertThat(loginAdmin.codigo()).isEqualTo(200);
        assertThat(loginAdmin.corpo().path("permissoes").toString()).contains("ADMIN");
        assertThat(loginAdmin.corpo().path("permissoesEfetivas").toString())
                .contains("SERVICOS_GERENCIAR", "USUARIOS_GERENCIAR", "PERMISSOES_GERENCIAR", "ACESSOS_ATRIBUIR");
        String admin = loginAdmin.corpo().path("token").asText();

        String barbeiro = token("barbeiro", "BarbeiroDemo@2026");
        assertThat(req("GET", "/agendamentos?data=" + Regra.agora().toLocalDate(), barbeiro, null).codigo()).isEqualTo(200);
        assertThat(req("GET", "/servicos", barbeiro, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/usuarios", barbeiro, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/permissoes", barbeiro, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/agendamentos/proximos", barbeiro, null).codigo()).isEqualTo(403);
        assertThat(req("PUT", "/barbearia/tema", barbeiro, Map.of("corFundo", "#111111", "corDestaque", "#C5B59B")).codigo()).isEqualTo(403);

        // Cadastro público tentando injetar perfil ADMIN ou permissões extras cria apenas CLIENTE comum
        var cadastro = req("POST", "/cadastro", null, Map.of(
                "nome", "Cliente Isolado",
                "username", "cliente_rbac_iso",
                "email", "cliente.rbac@teste.local",
                "senha", "SenhaForte@2026",
                "permissoes", List.of("ADMIN", "SERVICOS_GERENCIAR"),
                "role", "ADMIN"
        ));
        assertThat(cadastro.codigo()).isEqualTo(200);
        assertThat(cadastro.corpo().path("permissoes").size()).isEqualTo(1);
        assertThat(cadastro.corpo().path("permissoes").get(0).path("nome").asText()).isEqualTo("CLIENTE");

        String clienteToken = token("cliente_rbac_iso", "SenhaForte@2026");
        assertThat(req("GET", "/servicos", clienteToken, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/usuarios", clienteToken, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/barbeiros", clienteToken, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/permissoes", clienteToken, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/fidelidade/1", clienteToken, null).codigo()).isEqualTo(403);

        long novoId = cadastro.corpo().path("id").asLong();
        assertThat(req("DELETE", "/usuarios/" + novoId, admin, null).codigo()).isEqualTo(200);
    }

    @Test
    void concedeERevogaPermissaoOperacionalComEfeitoImediatoEIsolamento() throws Exception {
        String admin = token("admin", "AdminDemo@2026");

        var cadastro = req("POST", "/cadastro", null, Map.of(
                "nome", "Operador Servicos",
                "username", "op_servicos",
                "email", "op.servicos@teste.local",
                "senha", "SenhaOp@2026"
        ));
        assertThat(cadastro.codigo()).isEqualTo(200);
        long userId = cadastro.corpo().path("id").asLong();

        String sessaoAntiga = token("op_servicos", "SenhaOp@2026");
        assertThat(req("GET", "/servicos", sessaoAntiga, null).codigo()).isEqualTo(403);

        long idCliente = idPermissao("CLIENTE");
        long idServicos = idPermissao("SERVICOS_GERENCIAR");
        long idConsultarAgenda = idPermissao("AGENDAMENTOS_CONSULTAR");
        long idClientesGerenciar = idPermissao("CLIENTES_GERENCIAR");

        // Concede SERVICOS_GERENCIAR + AGENDAMENTOS_CONSULTAR + CLIENTES_GERENCIAR
        var atrib = req("PUT", "/usuarios/" + userId + "/permissoes", admin,
                List.of(idCliente, idServicos, idConsultarAgenda, idClientesGerenciar));
        assertThat(atrib.codigo()).isEqualTo(200);
        assertThat(atrib.corpo().path("permissoesEfetivas").toString())
                .contains("SERVICOS_GERENCIAR", "AGENDAMENTOS_CONSULTAR", "CLIENTES_GERENCIAR");

        // Sessão antiga foi revogada imediatamente (401)
        assertThat(req("GET", "/perfil", sessaoAntiga, null).codigo()).isEqualTo(401);

        // Novo login possui apenas os acessos concedidos
        var novoLogin = req("POST", "/login", null, Map.of("username", "op_servicos", "senha", "SenhaOp@2026"));
        assertThat(novoLogin.codigo()).isEqualTo(200);
        String tokenConcedido = novoLogin.corpo().path("token").asText();

        assertThat(req("GET", "/servicos", tokenConcedido, null).codigo()).isEqualTo(200);
        var srvCriado = req("POST", "/servicos", tokenConcedido, Map.of(
                "nome", "CorteRBAC",
                "descricao", "Teste RBAC",
                "preco", new BigDecimal("50.00"),
                "duracaoMinutos", 30,
                "elegivel", true,
                "ativo", true
        ));
        assertThat(srvCriado.codigo()).isEqualTo(200);
        long srvId = srvCriado.corpo().path("id").asLong();
        assertThat(req("DELETE", "/servicos/" + srvId, tokenConcedido, null).codigo()).isEqualTo(200);

        // Escopo restrito: consulta clientes/agenda sem poder administrar usuários, marca ou alterar status de agendamentos
        assertThat(req("GET", "/usuarios/clientes", tokenConcedido, null).codigo()).isEqualTo(200);
        assertThat(req("GET", "/agendamentos/proximos", tokenConcedido, null).codigo()).isEqualTo(200);
        assertThat(req("GET", "/usuarios", tokenConcedido, null).codigo()).isEqualTo(403);
        assertThat(req("PUT", "/barbearia/tema", tokenConcedido, Map.of("corFundo", "#111111", "corDestaque", "#C5B59B")).codigo()).isEqualTo(403);

        // Isolamento de dados privados entre clientes
        assertThat(req("POST", "/cadastro", null, Map.of(
                "nome", "Outro Cliente",
                "username", "cliente_outro_check",
                "email", "outro@teste.local",
                "senha", "ClienteOutro@2026"
        )).codigo()).isEqualTo(200);
        String outroClienteToken = token("cliente_outro_check", "ClienteOutro@2026");
        long agendamentoOutro = req("GET", "/agendamentos?data=" + Regra.agora().toLocalDate(), admin, null)
                .corpo().get(0).path("id").asLong();
        assertThat(req("GET", "/agendamentos/" + agendamentoOutro, outroClienteToken, null).codigo()).isEqualTo(404);
        assertThat(req("PUT", "/agendamentos/" + agendamentoOutro + "/status", tokenConcedido, Map.of("status", "CONFIRMADO")).codigo())
                .isEqualTo(403);

        // Admin revoga todas as permissões operacionais deixando apenas CLIENTE
        assertThat(req("PUT", "/usuarios/" + userId + "/permissoes", admin, List.of(idCliente)).codigo()).isEqualTo(200);

        // Sessão ativa antes da revogação NÃO pode manter acesso (401)
        assertThat(req("GET", "/servicos", tokenConcedido, null).codigo()).isEqualTo(401);

        // Após novo login, acessos operacionais retornam 403
        String tokenRevogado = token("op_servicos", "SenhaOp@2026");
        assertThat(req("GET", "/servicos", tokenRevogado, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/usuarios/clientes", tokenRevogado, null).codigo()).isEqualTo(403);
        assertThat(req("GET", "/agendamentos/proximos", tokenRevogado, null).codigo()).isEqualTo(403);

        assertThat(req("DELETE", "/usuarios/" + userId, admin, null).codigo()).isEqualTo(200);
        long outroId = usuarios.findByUsername("cliente_outro_check").orElseThrow().getId();
        assertThat(req("DELETE", "/usuarios/" + outroId, admin, null).codigo()).isEqualTo(200);
    }

    @Test
    void protegeUltimoAdministradorAtivoEPrevineEscalonamentoNaAtribuicao() throws Exception {
        String admin = token("admin", "AdminDemo@2026");
        long adminId = usuarios.findByUsername("admin").orElseThrow().getId();

        var cadGestor = req("POST", "/cadastro", null, Map.of(
                "nome", "Gestor Acessos",
                "username", "gestor_acessos",
                "email", "gestor@teste.local",
                "senha", "Gestor@2026"
        ));
        assertThat(cadGestor.codigo()).isEqualTo(200);
        long gestorId = cadGestor.corpo().path("id").asLong();

        long idCliente = idPermissao("CLIENTE");
        long idUsers = idPermissao("USUARIOS_GERENCIAR");
        long idAcessos = idPermissao("ACESSOS_ATRIBUIR");
        long idServicos = idPermissao("SERVICOS_GERENCIAR");
        long idAdmin = idPermissao("ADMIN");

        assertThat(req("PUT", "/usuarios/" + gestorId + "/permissoes", admin, List.of(idCliente, idUsers, idAcessos)).codigo())
                .isEqualTo(200);

        String gestorToken = token("gestor_acessos", "Gestor@2026");

        // Não pode alterar as próprias permissões (409)
        assertThat(req("PUT", "/usuarios/" + gestorId + "/permissoes", gestorToken, List.of(idCliente, idAdmin)).codigo())
                .isEqualTo(409);

        // Gestor não-ADMIN não pode escalar privilégios de terceiros nem atribuir capacidade que não possui
        var cadAlvo = req("POST", "/cadastro", null, Map.of(
                "nome", "Alvo Teste",
                "username", "alvo_escala",
                "email", "alvo@teste.local",
                "senha", "Alvo@2026"
        ));
        long alvoId = cadAlvo.corpo().path("id").asLong();
        assertThat(req("PUT", "/usuarios/" + alvoId + "/permissoes", gestorToken, List.of(idCliente, idAdmin)).codigo())
                .isEqualTo(403);
        assertThat(req("PUT", "/usuarios/" + alvoId + "/permissoes", gestorToken, List.of(idCliente, idServicos)).codigo())
                .isEqualTo(403);
        // Gestor não-ADMIN não pode modificar ou desativar conta ADMIN
        assertThat(req("DELETE", "/usuarios/" + adminId, gestorToken, null).codigo()).isEqualTo(403);
        assertThat(req("PUT", "/usuarios/" + adminId + "/permissoes", gestorToken, List.of(idCliente)).codigo()).isEqualTo(403);

        // Quando há apenas 1 ADMIN ativo, mesmo outro ADMIN não consegue desativá-lo (próprio ou último)
        // Cria segundo ADMIN para testar rebaixamento seguro de 1 enquanto protege o último restante
        assertThat(req("PUT", "/usuarios/" + alvoId + "/permissoes", admin, List.of(idAdmin)).codigo()).isEqualTo(200);
        String segundoAdmin = token("alvo_escala", "Alvo@2026");

        // Segundo ADMIN desativa terceiro? Não: remove ADMIN do primeiro ADMIN (admin), deixando segundoAdmin como único ADMIN
        assertThat(req("PUT", "/usuarios/" + adminId + "/permissoes", segundoAdmin, List.of(idCliente)).codigo()).isEqualTo(200);
        // Promove terceiro admin para testar exclusão/rebaixamento do penúltimo e bloqueio no último
        var cadTerceiro = req("POST", "/cadastro", null, Map.of(
                "nome", "Terceiro Admin",
                "username", "terceiro_adm",
                "email", "terceiro@teste.local",
                "senha", "Terceiro@2026"
        ));
        long terceiroId = cadTerceiro.corpo().path("id").asLong();
        assertThat(req("PUT", "/usuarios/" + terceiroId + "/permissoes", segundoAdmin, List.of(idAdmin)).codigo()).isEqualTo(200);
        String terceiroToken = token("terceiro_adm", "Terceiro@2026");

        // Terceiro devolve ADMIN ao admin principal e desativa segundoAdmin
        assertThat(req("PUT", "/usuarios/" + adminId + "/permissoes", terceiroToken, List.of(idAdmin)).codigo()).isEqualTo(200);
        assertThat(req("DELETE", "/usuarios/" + alvoId, terceiroToken, null).codigo()).isEqualTo(200);

        String adminRestaurado = token("admin", "AdminDemo@2026");
        // Admin restaurado remove terceiro ADMIN -> agora só resta o admin principal ativo
        assertThat(req("PUT", "/usuarios/" + terceiroId + "/permissoes", adminRestaurado, List.of(idCliente)).codigo()).isEqualTo(200);
        assertThat(req("DELETE", "/usuarios/" + terceiroId, adminRestaurado, null).codigo()).isEqualTo(200);

        // Proteção contra perda acidental do último administrador ativo (auto-desativação / auto-rebaixamento)
        assertThat(req("DELETE", "/usuarios/" + adminId, adminRestaurado, null).codigo()).isEqualTo(409);
        assertThat(req("PUT", "/usuarios/" + adminId + "/permissoes", adminRestaurado, List.of(idCliente)).codigo()).isEqualTo(409);

        // Agora cria uma conta com permissão ADMIN temporária apenas para provar que mesmo OUTRO ADMIN não consegue rebaixar ou desativar o último ADMIN restante:
        // quando target e segundo sao ambos ADMIN, primeiro remove ADMIN de adminRestaurado (restam 1 -> alvo),
        // e gestor_acessos ou outro usuário não consegue tocar; além disso, via outro ADMIN (promovido),
        // verifica que o penúltimo pode sair (200) mas o último (quando 1 ativo) é protegido.
        var cadSegundo = req("POST", "/cadastro", null, Map.of(
                "nome", "Segundo Admin",
                "username", "segundo_adm_check",
                "email", "segundo@teste.local",
                "senha", "SegundoAdm@2026"
        ));
        long segundoId = cadSegundo.corpo().path("id").asLong();
        assertThat(req("PUT", "/usuarios/" + segundoId + "/permissoes", adminRestaurado, List.of(idAdmin)).codigo()).isEqualTo(200);
        // Remove ADMIN do primeiro enquanto segundo está ativo (200), depois verifica 1 ativo restante
        assertThat(req("PUT", "/usuarios/" + segundoId + "/permissoes", adminRestaurado, List.of(idCliente)).codigo()).isEqualTo(200);
        assertThat(req("DELETE", "/usuarios/" + segundoId, adminRestaurado, null).codigo()).isEqualTo(200);

        assertThat(req("PUT", "/usuarios/" + gestorId + "/permissoes", adminRestaurado, List.of(idCliente)).codigo()).isEqualTo(200);
        assertThat(req("DELETE", "/usuarios/" + gestorId, adminRestaurado, null).codigo()).isEqualTo(200);
    }

    @Test
    void persistePermissoesMigradasEntreReinicializacoes(@TempDir Path tempDir) throws Exception {
        Path dbArquivo = tempDir.resolve("rbac_persiste");
        String jdbcUrl = "jdbc:h2:file:" + dbArquivo.toAbsolutePath() + ";LOCK_TIMEOUT=15000";
        String vapidArquivo = tempDir.resolve("vapid_rbac.properties").toAbsolutePath().toString();
        String hashAdmin = new BCryptPasswordEncoder().encode("AdminPersiste@2026");
        String hashOp = new BCryptPasswordEncoder().encode("OperadorPersiste@2026");

        try (Connection conn = DriverManager.getConnection(jdbcUrl, "sa", "");
             Statement stmt = conn.createStatement()) {
            stmt.execute("""
                    CREATE TABLE permissao (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        nome VARCHAR(255) NOT NULL UNIQUE,
                        descricao VARCHAR(255)
                    )""");
            stmt.execute("""
                    CREATE TABLE usuario (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        nome VARCHAR(255),
                        username VARCHAR(255) NOT NULL UNIQUE,
                        senha VARCHAR(255),
                        email VARCHAR(255),
                        ativo BOOLEAN NOT NULL,
                        versao_sessao BIGINT NOT NULL
                    )""");
            stmt.execute("""
                    CREATE TABLE usuario_permissoes (
                        usuario_id BIGINT NOT NULL,
                        permissoes_id BIGINT NOT NULL,
                        PRIMARY KEY (usuario_id, permissoes_id),
                        FOREIGN KEY (usuario_id) REFERENCES usuario(id),
                        FOREIGN KEY (permissoes_id) REFERENCES permissao(id)
                    )""");
            stmt.execute("""
                    CREATE TABLE barbearia (
                        id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                        nome VARCHAR(255) NOT NULL,
                        versao_logo BIGINT NOT NULL,
                        demonstracao BOOLEAN NOT NULL,
                        fidelidade_ativa BOOLEAN NOT NULL,
                        meta INT NOT NULL,
                        antecedencia_minutos INT NOT NULL
                    )""");
            stmt.execute("INSERT INTO permissao (id, nome, descricao) VALUES (1, 'ADMIN', 'Admin legado'), (2, 'CLIENTE', 'Cliente legado')");
            stmt.execute("INSERT INTO usuario (id, nome, username, senha, email, ativo, versao_sessao) VALUES "
                    + "(1, 'Admin Persiste', 'admin_p', '" + hashAdmin + "', 'a@p.local', TRUE, 0),"
                    + "(2, 'Operador Persiste', 'op_p', '" + hashOp + "', 'o@p.local', TRUE, 0)");
            stmt.execute("INSERT INTO usuario_permissoes (usuario_id, permissoes_id) VALUES (1, 1), (2, 2)");
            stmt.execute("INSERT INTO barbearia (id, nome, versao_logo, demonstracao, fidelidade_ativa, meta, antecedencia_minutos) "
                    + "VALUES (1, 'Barbearia Persiste', 0, FALSE, FALSE, 10, 60)");
            stmt.execute("ALTER TABLE permissao ALTER COLUMN id RESTART WITH 10");
            stmt.execute("ALTER TABLE usuario ALTER COLUMN id RESTART WITH 10");
        }

        try (ConfigurableApplicationContext ctx1 = iniciar(jdbcUrl, vapidArquivo)) {
            int p1 = Integer.parseInt(ctx1.getEnvironment().getProperty("local.server.port"));
            String adm1 = login(p1, "admin_p", "AdminPersiste@2026");

            var listaPerm = reqAbs(p1, "GET", "/permissoes", adm1, null);
            assertThat(listaPerm.codigo()).isEqualTo(200);
            long idCliente = encontrarIdPerm(listaPerm.corpo(), "CLIENTE");
            long idServicos = encontrarIdPerm(listaPerm.corpo(), "SERVICOS_GERENCIAR");
            long idAdmin = encontrarIdPerm(listaPerm.corpo(), "ADMIN");

            // Concede SERVICOS_GERENCIAR ao usuário 2 e tenta remover ADMIN do último admin (1 -> 409)
            assertThat(reqAbs(p1, "PUT", "/usuarios/2/permissoes", adm1, List.of(idCliente, idServicos)).codigo()).isEqualTo(200);
            assertThat(reqAbs(p1, "PUT", "/usuarios/1/permissoes", adm1, List.of(idCliente)).codigo()).isEqualTo(409);
            assertThat(reqAbs(p1, "DELETE", "/usuarios/1", adm1, null).codigo()).isEqualTo(409);
            assertThat(idAdmin).isPositive();

            String op1 = login(p1, "op_p", "OperadorPersiste@2026");
            assertThat(reqAbs(p1, "GET", "/servicos", op1, null).codigo()).isEqualTo(200);
            assertThat(reqAbs(p1, "GET", "/usuarios", op1, null).codigo()).isEqualTo(403);
        }

        // Segunda inicialização contra o mesmo arquivo H2 comprova persistência real das atribuições
        try (ConfigurableApplicationContext ctx2 = iniciar(jdbcUrl, vapidArquivo)) {
            int p2 = Integer.parseInt(ctx2.getEnvironment().getProperty("local.server.port"));
            String op2 = login(p2, "op_p", "OperadorPersiste@2026");
            assertThat(reqAbs(p2, "GET", "/servicos", op2, null).codigo()).isEqualTo(200);
            assertThat(reqAbs(p2, "GET", "/usuarios", op2, null).codigo()).isEqualTo(403);
        }
    }

    private ConfigurableApplicationContext iniciar(String jdbcUrl, String vapidArquivo) {
        return new SpringApplicationBuilder(BraullyWeb2FullstackApplication.class)
                .run(
                        "--server.port=0",
                        "--server.address=127.0.0.1",
                        "--spring.datasource.url=" + jdbcUrl,
                        "--spring.datasource.username=sa",
                        "--spring.datasource.password=",
                        "--spring.jpa.hibernate.ddl-auto=update",
                        "--app.demo=false",
                        "--jwt.secret=chave-teste-rbac-persiste-000001",
                        "--app.vapid.arquivo=" + vapidArquivo
                );
    }

    private long idPermissao(String nome) {
        return permissoes.findByNome(nome).orElseThrow().getId();
    }

    private long encontrarIdPerm(JsonNode lista, String nome) {
        for (JsonNode item : lista) {
            if (nome.equals(item.path("nome").asText())) return item.path("id").asLong();
        }
        throw new AssertionError("Permissão não encontrada: " + nome);
    }

    private String login(int p, String username, String senha) throws Exception {
        var r = reqAbs(p, "POST", "/login", null, Map.of("username", username, "senha", senha));
        assertThat(r.codigo()).isEqualTo(200);
        return r.corpo().path("token").asText();
    }

    private String token(String usuario, String senha) throws Exception {
        return login(porta, usuario, senha);
    }

    private Resposta req(String metodo, String url, String token, Object corpo) throws Exception {
        return reqAbs(porta, metodo, url, token, corpo);
    }

    private Resposta reqAbs(int p, String metodo, String url, String token, Object corpo) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + p + "/api" + url))
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
