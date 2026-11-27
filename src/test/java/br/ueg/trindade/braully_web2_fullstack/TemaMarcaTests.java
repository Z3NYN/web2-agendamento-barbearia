package br.ueg.trindade.braully_web2_fullstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import javax.imageio.ImageIO;

import br.ueg.trindade.braully_web2_fullstack.model.Barbearia;
import br.ueg.trindade.braully_web2_fullstack.model.Foto;
import br.ueg.trindade.braully_web2_fullstack.repository.BarbeariaRepository;
import br.ueg.trindade.braully_web2_fullstack.repository.FotoRepository;
import br.ueg.trindade.braully_web2_fullstack.service.MarcaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:tema_marca;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "jwt.secret=chave-exclusiva-de-teste-tema-00001",
    "app.vapid.arquivo=${java.io.tmpdir}/vapid-tema-marca-test.properties"
})
class TemaMarcaTests {

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    @LocalServerPort int porta;
    @Autowired BarbeariaRepository barbearias;
    @Autowired FotoRepository fotos;

    record Resposta(int codigo, JsonNode corpo) {}

    @Test
    void autorizaSomenteAdminNoEndpointDeTema() throws Exception {
        String payload = json.writeValueAsString(Map.of("corFundo", "#0B1220", "corDestaque", "#2563EB"));
        assertThat(req("PUT", "/barbearia/tema", null, payload).codigo()).isEqualTo(401);

        String cliente = token("cliente", "ClienteDemo@2026");
        assertThat(req("PUT", "/barbearia/tema", cliente, payload).codigo()).isEqualTo(403);

        String barbeiro = token("barbeiro", "BarbeiroDemo@2026");
        assertThat(req("PUT", "/barbearia/tema", barbeiro, payload).codigo()).isEqualTo(403);

        String admin = token("admin", "AdminDemo@2026");
        assertThat(req("PUT", "/barbearia/tema", admin, payload).codigo()).isEqualTo(200);
    }

    @Test
    void salvaCoresValidasRejeitaFundoIncompativelERestauraPadraoPreservandoConfiguracoes() throws Exception {
        String admin = token("admin", "AdminDemo@2026");
        Barbearia loja = barbearias.findFirstByOrderByIdAsc().orElseThrow();
        loja.logo = criarPngMinimo();
        loja.tipoLogo = "image/png";
        loja.versaoLogo = 7L;
        loja.nome = "Barbearia Editorial";
        loja.descricao = "Descrição preservada";
        loja.endereco = "Av. Central, 100";
        loja.telefone = "62999990000";
        loja.instagram = "studio.editorial";
        loja.whatsapp = "5562999990000";
        loja.demonstracao = true;
        loja.fidelidadeAtiva = true;
        loja.meta = 8;
        loja.antecedenciaMinutos = 90;
        barbearias.saveAndFlush(loja);

        Foto fotoCapa = new Foto();
        fotoCapa.barbearia = loja;
        fotoCapa.alvo = Foto.Alvo.CAPA;
        fotoCapa.tipo = "image/png";
        fotoCapa.conteudo = criarPngMinimo();
        fotoCapa.legenda = "Capa preservada";
        fotos.saveAndFlush(fotoCapa);

        byte[] logoEsperado = loja.logo.clone();
        long qtdFotosAntes = fotos.count();

        // Testa tons de destaque padrão, branco, preto, cinza, vermelho, azul, verde e fundos escuros alternativos.
        List<String[]> combinacoesValidas = List.of(
                new String[]{"#111111", "#C5B59B"},
                new String[]{"#000000", "#FFFFFF"},
                new String[]{"#0B1220", "#000000"},
                new String[]{"#0D1914", "#808080"},
                new String[]{"#1A1216", "#DC2626"},
                new String[]{"#101826", "#2563EB"},
                new String[]{"#121A14", "#16A34A"}
        );

        for (String[] par : combinacoesValidas) {
            var resp = req("PUT", "/barbearia/tema", admin,
                    json.writeValueAsString(Map.of("corFundo", par[0], "corDestaque", par[1])));
            assertThat(resp.codigo()).isEqualTo(200);
            assertThat(resp.corpo().path("corFundo").asText()).isEqualTo(par[0]);
            assertThat(resp.corpo().path("corDestaque").asText()).isEqualTo(par[1]);

            Barbearia persistida = barbearias.findFirstByOrderByIdAsc().orElseThrow();
            assertThat(persistida.nome).isEqualTo("Barbearia Editorial");
            assertThat(persistida.descricao).isEqualTo("Descrição preservada");
            assertThat(persistida.endereco).isEqualTo("Av. Central, 100");
            assertThat(persistida.telefone).isEqualTo("62999990000");
            assertThat(persistida.instagram).isEqualTo("studio.editorial");
            assertThat(persistida.whatsapp).isEqualTo("5562999990000");
            assertThat(persistida.demonstracao).isTrue();
            assertThat(persistida.fidelidadeAtiva).isTrue();
            assertThat(persistida.meta).isEqualTo(8);
            assertThat(persistida.antecedenciaMinutos).isEqualTo(90);
            assertThat(persistida.versaoLogo).isEqualTo(7L);
            assertThat(persistida.logo).containsExactly(logoEsperado);
            assertThat(fotos.count()).isEqualTo(qtdFotosAntes);
        }

        // Rejeita cores de fundo claras ou inválidas em ambos endpoints.
        for (String fundoInvalido : List.of("#FFFFFF", "#CCCCCC", "#777777", "#FFFF00", "#123", "invalido")) {
            var rTema = req("PUT", "/barbearia/tema", admin,
                    json.writeValueAsString(Map.of("corFundo", fundoInvalido, "corDestaque", "#C5B59B")));
            assertThat(rTema.codigo()).isEqualTo(400);

            var rFull = req("PUT", "/barbearia", admin, json.writeValueAsString(Map.of(
                    "nome", "Barbearia Editorial",
                    "corFundo", fundoInvalido,
                    "corDestaque", "#C5B59B",
                    "demonstracao", true,
                    "fidelidadeAtiva", true,
                    "meta", 8,
                    "premioId", loja.premio.getId(),
                    "antecedenciaMinutos", 90
            )));
            assertThat(rFull.codigo()).isEqualTo(400);
        }

        // Restaura tema padrão e confirma não alteração do modo demonstração mesmo quando falso.
        Barbearia semDemo = barbearias.findFirstByOrderByIdAsc().orElseThrow();
        semDemo.demonstracao = false;
        barbearias.saveAndFlush(semDemo);

        var restaurado = req("PUT", "/barbearia/tema", admin,
                json.writeValueAsString(Map.of(
                        "corFundo", MarcaService.COR_FUNDO_PADRAO,
                        "corDestaque", MarcaService.COR_DESTAQUE_PADRAO)));
        assertThat(restaurado.codigo()).isEqualTo(200);
        assertThat(restaurado.corpo().path("corFundo").asText()).isEqualTo("#111111");
        assertThat(restaurado.corpo().path("corDestaque").asText()).isEqualTo("#C5B59B");
        assertThat(restaurado.corpo().path("demonstracao").asBoolean()).isFalse();
    }

    @Test
    void trataCoresLegadasAusentesOuInvalidasNoBancoComSeguranca() throws Exception {
        Barbearia loja = barbearias.findFirstByOrderByIdAsc().orElseThrow();
        loja.corFundo = "#FFFFFF";
        loja.corDestaque = "quebrada";
        barbearias.saveAndFlush(loja);

        var publico = req("GET", "/publico/barbearia", null, null);
        assertThat(publico.codigo()).isEqualTo(200);
        assertThat(publico.corpo().path("corFundo").asText()).isEqualTo(MarcaService.COR_FUNDO_PADRAO);
        assertThat(publico.corpo().path("corDestaque").asText()).isEqualTo(MarcaService.COR_DESTAQUE_PADRAO);
    }

    private byte[] criarPngMinimo() throws Exception {
        BufferedImage img = new BufferedImage(2, 2, BufferedImage.TYPE_INT_ARGB);
        var out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    private String token(String usuario, String senha) throws Exception {
        var r = req("POST", "/login", null, json.writeValueAsString(Map.of("username", usuario, "senha", senha)));
        assertThat(r.codigo()).isEqualTo(200);
        return r.corpo().path("token").asText();
    }

    private Resposta req(String metodo, String path, String token, String body) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + porta + "/api" + path));
        if (token != null) b.header("Authorization", "Bearer " + token);
        if (body != null) {
            b.header("Content-Type", "application/json")
             .method(metodo, HttpRequest.BodyPublishers.ofString(body));
        } else {
            b.method(metodo, HttpRequest.BodyPublishers.noBody());
        }
        var resp = http.send(b.build(), HttpResponse.BodyHandlers.ofString());
        return new Resposta(resp.statusCode(), resp.body().isBlank() ? null : json.readTree(resp.body()));
    }
}
