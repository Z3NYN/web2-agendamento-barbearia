package br.ueg.trindade.braully_web2_fullstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.security.interfaces.ECPublicKey;
import java.security.spec.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import javax.crypto.Cipher;
import javax.crypto.KeyAgreement;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import com.sun.net.httpserver.HttpServer;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.repository.AgendamentoRepository;
import br.ueg.trindade.braully_web2_fullstack.repository.InscricaoPushRepository;
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
    "jwt.secret=chave-exclusiva-de-teste-automacao-00001",
    "app.vapid.allow-loopback-http=true"
})
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class BraullyWeb2FullstackApplicationTests {
    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();
    @LocalServerPort int porta;
    @Autowired AgendamentoRepository agenda;
    @Autowired UsuarioRepository usuarios;
    @Autowired InscricaoPushRepository inscricoesPush;

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

    @Test @Order(5)
    void notificaEventosProtegeDestinatarioDeduplicaEEnviaWebPush() throws Exception {
        var chave = req("GET", "/publico/push-chave", null, null);
        assertThat(chave.codigo()).isEqualTo(200);
        String vapidPubB64 = chave.corpo().path("publicKey").asText();
        byte[] vapidBytes = Base64.getUrlDecoder().decode(vapidPubB64);
        assertThat(vapidBytes).hasSize(65);
        assertThat(vapidBytes[0]).isEqualTo((byte) 0x04);

        var pushRecebidos = new LinkedBlockingQueue<Map<String, Object>>();
        var pushServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        pushServer.createContext("/push", ex -> {
            byte[] corpo = ex.getRequestBody().readAllBytes();
            var info = new HashMap<String, Object>();
            info.put("auth", Optional.ofNullable(ex.getRequestHeaders().getFirst("Authorization")).orElse(""));
            info.put("enc", Optional.ofNullable(ex.getRequestHeaders().getFirst("Content-Encoding")).orElse(""));
            info.put("body", corpo);
            pushRecebidos.add(info);
            ex.sendResponseHeaders(201, -1);
            ex.close();
        });
        pushServer.createContext("/push-gone", ex -> {
            ex.getRequestBody().readAllBytes();
            ex.sendResponseHeaders(410, -1);
            ex.close();
        });
        pushServer.start();
        try {
            String cliente = token("cliente", "ClienteDemo@2026");
            String admin = token("admin", "AdminDemo@2026");
            String barbeiro = token("barbeiro", "BarbeiroDemo@2026");

            // Gera par P-256 + auth secret válidos para inscrição RFC 8291
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("EC");
            kpg.initialize(new ECGenParameterSpec("secp256r1"));
            KeyPair uaKeyPair = kpg.generateKeyPair();
            ECPublicKey uaPub = (ECPublicKey) uaKeyPair.getPublic();
            byte[] uaRaw = new byte[65];
            uaRaw[0] = 0x04;
            byte[] x = uaPub.getW().getAffineX().toByteArray();
            byte[] y = uaPub.getW().getAffineY().toByteArray();
            System.arraycopy(x, Math.max(0, x.length - 32), uaRaw, 1 + Math.max(0, 32 - x.length), Math.min(32, x.length));
            System.arraycopy(y, Math.max(0, y.length - 32), uaRaw, 33 + Math.max(0, 32 - y.length), Math.min(32, y.length));
            byte[] authBytes = new byte[16];
            new SecureRandom().nextBytes(authBytes);
            String p256dhB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(uaRaw);
            String authB64 = Base64.getUrlEncoder().withoutPadding().encodeToString(authBytes);

            // SSRF: endpoints privados/inválidos devem ser rejeitados (400)
            for (String ssrf : List.of(
                    "https://127.0.0.1/push",
                    "https://10.0.0.1/push",
                    "https://192.168.1.1/push",
                    "https://169.254.169.254/latest",
                    "http://example.com/push",
                    "https://user@127.0.0.1/push")) {
                assertThat(req("POST", "/notificacoes/push/inscrever", cliente, Map.of(
                        "endpoint", ssrf, "p256dh", p256dhB64, "auth", authB64)).codigo()).isEqualTo(400);
            }

            String endpoint = "http://127.0.0.1:" + pushServer.getAddress().getPort() + "/push";
            assertThat(req("POST", "/notificacoes/push/inscrever", cliente, Map.of(
                    "endpoint", endpoint, "p256dh", p256dhB64, "auth", authB64)).codigo()).isEqualTo(200);

            long corte = idPublico("servicos", "Corte clássico");
            long rafa = idPublico("barbeiros", "Rafa Demo");
            var inicio = Regra.agora().toLocalDate().plusDays(3).atTime(14, 0);
            var reserva = req("POST", "/agendamentos", cliente, nova(corte, rafa, inicio));
            assertThat(reserva.codigo()).isEqualTo(200);
            long agId = reserva.corpo().path("id").asLong();
            // Consome push da criação da reserva
            assertThat(pushRecebidos.poll(5, TimeUnit.SECONDS)).isNotNull();

            assertThat(req("PUT", "/agendamentos/" + agId + "/status", barbeiro, Map.of("status", "CONFIRMADO")).codigo()).isEqualTo(200);

            var push = pushRecebidos.poll(5, TimeUnit.SECONDS);
            assertThat(push).isNotNull();
            assertThat(push.get("enc")).isEqualTo("aes128gcm");

            // Verifica assinatura VAPID ES256 (RFC 8292)
            String authHeader = (String) push.get("auth");
            assertThat(authHeader).startsWith("vapid t=").contains(", k=" + vapidPubB64);
            String jwt = authHeader.substring("vapid t=".length(), authHeader.indexOf(", k="));
            String[] jwtParts = jwt.split("\\.");
            assertThat(jwtParts).hasSize(3);
            var params = AlgorithmParameters.getInstance("EC");
            params.init(new ECGenParameterSpec("secp256r1"));
            ECParameterSpec ecSpec = params.getParameterSpec(ECParameterSpec.class);
            ECPublicKey vapidEcPub = (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(
                    new ECPoint(new BigInteger(1, Arrays.copyOfRange(vapidBytes, 1, 33)),
                            new BigInteger(1, Arrays.copyOfRange(vapidBytes, 33, 65))), ecSpec));
            Signature verifier = Signature.getInstance("SHA256withECDSAinP1363Format");
            verifier.initVerify(vapidEcPub);
            verifier.update((jwtParts[0] + "." + jwtParts[1]).getBytes(StandardCharsets.US_ASCII));
            assertThat(verifier.verify(Base64.getUrlDecoder().decode(jwtParts[2]))).isTrue();
            JsonNode vapidClaims = json.readTree(Base64.getUrlDecoder().decode(jwtParts[1]));
            assertThat(vapidClaims.path("aud").asText()).isEqualTo("http://127.0.0.1:" + pushServer.getAddress().getPort());

            // Decripta carga RFC 8291 (aes128gcm) com a chave privada do assinante
            byte[] rawBody = (byte[]) push.get("body");
            JsonNode pushPayload = decifrarWebPushAes128Gcm(rawBody, uaKeyPair.getPrivate(), uaRaw, authBytes, ecSpec);
            assertThat(pushPayload.path("titulo").asText()).isEqualTo("Atendimento confirmado");
            assertThat(pushPayload.path("destinoUrl").asText()).isEqualTo("/meus-horarios");
            assertThat(pushPayload.toString()).doesNotContain("ClienteDemo").doesNotContain("admin@");

            var painelCliente = req("GET", "/notificacoes", cliente, null);
            assertThat(painelCliente.codigo()).isEqualTo(200);
            String textoCli = painelCliente.corpo().toString();
            assertThat(textoCli).contains("CONFIRMADO").contains("RECOMPENSA_FIDELIDADE");
            assertThat(textoCli).doesNotContain("ClienteDemo").doesNotContain("admin@");

            var painelAdmin = req("GET", "/notificacoes", admin, null);
            assertThat(painelAdmin.codigo()).isEqualTo(200);
            long idAdmin = painelAdmin.corpo().path("itens").get(0).path("id").asLong();
            // Isolamento de destinatário: cliente não pode marcar notificação do admin como lida
            assertThat(req("PUT", "/notificacoes/" + idAdmin + "/lida", cliente, null).codigo()).isEqualTo(404);

            // Lembrete para agendamento dentro das próximas 2h sem duplicidade
            var a = agenda.findById(agId).orElseThrow();
            a.inicio = Regra.agora().plusMinutes(45);
            a.fim = a.inicio.plusMinutes(30);
            agenda.save(a);
            var p1 = req("GET", "/notificacoes", cliente, null).corpo().path("itens");
            var p2 = req("GET", "/notificacoes", cliente, null).corpo().path("itens");
            long lembretes1 = countTipo(p1, "LEMBRETE");
            long lembretes2 = countTipo(p2, "LEMBRETE");
            assertThat(lembretes1).isGreaterThanOrEqualTo(1);
            assertThat(lembretes2).isEqualTo(lembretes1);

            // Dispositivo compartilhado: outra conta assume o mesmo endpoint e isola a conta anterior
            assertThat(req("POST", "/cadastro", null, Map.of(
                    "nome", "Cliente Dois", "username", "clientedois", "email", "c2@teste.local", "senha", "ClienteDois@2026")).codigo()).isEqualTo(200);
            String cliente2 = token("clientedois", "ClienteDois@2026");
            assertThat(req("POST", "/notificacoes/push/inscrever", cliente2, Map.of(
                    "endpoint", endpoint, "p256dh", p256dhB64, "auth", authB64)).codigo()).isEqualTo(200);
            assertThat(req("GET", "/notificacoes/preferencias", cliente, null).corpo().path("notifPush").asBoolean()).isFalse();

            // Evento para cliente1 NÃO deve disparar push para o endpoint assumido por cliente2
            pushRecebidos.clear();
            var inicioCli1 = Regra.agora().toLocalDate().plusDays(4).atTime(15, 0);
            assertThat(req("POST", "/agendamentos", cliente, nova(corte, rafa, inicioCli1)).codigo()).isEqualTo(200);
            assertThat(pushRecebidos.poll(400, TimeUnit.MILLISECONDS)).isNull();

            // SSE exige autenticação (401) e logout revoga token + inscrições push da conta
            assertThat(http.send(pedido("GET", "/notificacoes/stream", null, null), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(401);
            assertThat(req("POST", "/logout", cliente2, null).codigo()).isEqualTo(200);
            assertThat(http.send(pedido("GET", "/notificacoes/stream", cliente2, null), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(401);
            String cliente2Novo = token("clientedois", "ClienteDois@2026");
            assertThat(req("GET", "/notificacoes/preferencias", cliente2Novo, null).corpo().path("notifPush").asBoolean()).isFalse();

            // Resposta 410 Gone remove inscrição expirada de forma transacional
            String endpointGone = "http://127.0.0.1:" + pushServer.getAddress().getPort() + "/push-gone";
            assertThat(req("POST", "/notificacoes/push/inscrever", cliente2Novo, Map.of(
                    "endpoint", endpointGone, "p256dh", p256dhB64, "auth", authB64)).codigo()).isEqualTo(200);
            var inicioCli2 = Regra.agora().toLocalDate().plusDays(5).atTime(15, 0);
            assertThat(req("POST", "/agendamentos", cliente2Novo, nova(corte, rafa, inicioCli2)).codigo()).isEqualTo(200);
            long deadline = System.currentTimeMillis() + 5000;
            while (System.currentTimeMillis() < deadline && inscricoesPush.findByEndpoint(endpointGone).isPresent()) {
                Thread.sleep(50);
            }
            assertThat(inscricoesPush.findByEndpoint(endpointGone)).isEmpty();

            assertThat(req("PUT", "/notificacoes/preferencias", cliente, Map.of(
                    "notifSistema", true, "notifPush", false, "notifLembretes", false, "notifFidelidade", true)).codigo()).isEqualTo(200);
        } finally {
            pushServer.stop(0);
        }
    }

    private JsonNode decifrarWebPushAes128Gcm(byte[] body, PrivateKey uaPriv, byte[] uaPubRaw, byte[] authSecret, ECParameterSpec ecSpec) throws Exception {
        ByteBuffer buf = ByteBuffer.wrap(body);
        byte[] salt = new byte[16];
        buf.get(salt);
        int rs = buf.getInt();
        assertThat(rs).isEqualTo(4096);
        int idLen = buf.get() & 0xff;
        assertThat(idLen).isEqualTo(65);
        byte[] asPubRaw = new byte[idLen];
        buf.get(asPubRaw);
        byte[] ciphertext = new byte[buf.remaining()];
        buf.get(ciphertext);

        ECPublicKey asPub = (ECPublicKey) KeyFactory.getInstance("EC").generatePublic(new ECPublicKeySpec(
                new ECPoint(new BigInteger(1, Arrays.copyOfRange(asPubRaw, 1, 33)),
                        new BigInteger(1, Arrays.copyOfRange(asPubRaw, 33, 65))), ecSpec));
        KeyAgreement ka = KeyAgreement.getInstance("ECDH");
        ka.init(uaPriv);
        ka.doPhase(asPub, true);
        byte[] ecdhSecret = ka.generateSecret();

        byte[] prkKey = hmacSha256(authSecret, ecdhSecret);
        byte[] infoPrefix = "WebPush: info\0".getBytes(StandardCharsets.UTF_8);
        byte[] keyInfo = ByteBuffer.allocate(infoPrefix.length + uaPubRaw.length + asPubRaw.length + 1)
                .put(infoPrefix).put(uaPubRaw).put(asPubRaw).put((byte) 1).array();
        byte[] ikm = hmacSha256(prkKey, keyInfo);
        byte[] prk = hmacSha256(salt, ikm);
        byte[] cek = Arrays.copyOf(hmacSha256(prk, "Content-Encoding: aes128gcm\0\1".getBytes(StandardCharsets.UTF_8)), 16);
        byte[] nonce = Arrays.copyOf(hmacSha256(prk, "Content-Encoding: nonce\0\1".getBytes(StandardCharsets.UTF_8)), 12);

        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(cek, "AES"), new GCMParameterSpec(128, nonce));
        byte[] padded = cipher.doFinal(ciphertext);
        assertThat(padded[padded.length - 1]).isEqualTo((byte) 2);
        return json.readTree(new String(padded, 0, padded.length - 1, StandardCharsets.UTF_8));
    }

    private static byte[] hmacSha256(byte[] key, byte[] data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(data);
    }

    private long countTipo(JsonNode itens, String tipo) {
        long c = 0;
        for (JsonNode n : itens) if (tipo.equals(n.path("tipo").asText())) c++;
        return c;
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
