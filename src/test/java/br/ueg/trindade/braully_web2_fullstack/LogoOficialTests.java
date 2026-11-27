package br.ueg.trindade.braully_web2_fullstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import javax.imageio.ImageIO;

import br.ueg.trindade.braully_web2_fullstack.model.Barbearia;
import br.ueg.trindade.braully_web2_fullstack.repository.BarbeariaRepository;
import br.ueg.trindade.braully_web2_fullstack.service.MarcaService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mock.web.MockMultipartFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:logo_oficial;DB_CLOSE_DELAY=-1",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "jwt.secret=chave-exclusiva-de-teste-logo-00001",
    "app.vapid.arquivo=${java.io.tmpdir}/vapid-logo-oficial-test.properties"
})
class LogoOficialTests {

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    @LocalServerPort int porta;
    @Autowired BarbeariaRepository barbearias;
    @Autowired MarcaService marcaService;

    record Resposta(int codigo, JsonNode corpo) {}

    @Test
    void instalacaoNovaSemeiaWordmarkOficialEServePngOficial() throws Exception {
        byte[] oficial = new ClassPathResource("demo/marca.png").getContentAsByteArray();

        var publico = req("GET", "/publico/barbearia", null, null);
        assertThat(publico.codigo()).isEqualTo(200);
        assertThat(publico.corpo().path("logo").asText()).isEqualTo(MarcaService.LOGO_OFICIAL_URL);

        var logoResp = reqBytes("/publico/logo");
        assertThat(logoResp.statusCode()).isEqualTo(200);
        assertThat(logoResp.headers().firstValue("Content-Type")).contains("image/png");
        assertThat(logoResp.body()).isEqualTo(oficial);
    }

    @Test
    void logoLegadoSobreviveAModificacoesDeTemaEDemonstracaoSemReescreverBanco() throws Exception {
        byte[] oficial = new ClassPathResource("demo/marca.png").getContentAsByteArray();
        byte[] legado = new ClassPathResource("demo/soldado.jpg").getContentAsByteArray();

        Barbearia loja = barbearias.findFirstByOrderByIdAsc().orElseThrow();
        loja.logo = legado;
        loja.tipoLogo = "image/jpeg";
        loja.versaoLogo = 9L;
        loja.demonstracao = false;
        barbearias.saveAndFlush(loja);

        var antes = req("GET", "/publico/barbearia", null, null);
        assertThat(antes.codigo()).isEqualTo(200);
        assertThat(antes.corpo().path("logo").asText()).isEqualTo(MarcaService.LOGO_OFICIAL_URL);

        var logoResp = reqBytes("/publico/logo");
        assertThat(logoResp.statusCode()).isEqualTo(200);
        assertThat(logoResp.headers().firstValue("Content-Type")).contains("image/png");
        assertThat(logoResp.body()).isEqualTo(oficial);

        String admin = token("admin", "AdminDemo@2026");
        var temaAlt = req("PUT", "/barbearia/tema", admin,
                json.writeValueAsString(Map.of("corFundo", "#0B1220", "corDestaque", "#2563EB")));
        assertThat(temaAlt.codigo()).isEqualTo(200);
        assertThat(temaAlt.corpo().path("logo").asText()).isEqualTo(MarcaService.LOGO_OFICIAL_URL);

        var temaPadrao = req("PUT", "/barbearia/tema", admin,
                json.writeValueAsString(Map.of(
                        "corFundo", MarcaService.COR_FUNDO_PADRAO,
                        "corDestaque", MarcaService.COR_DESTAQUE_PADRAO)));
        assertThat(temaPadrao.codigo()).isEqualTo(200);
        assertThat(temaPadrao.corpo().path("logo").asText()).isEqualTo(MarcaService.LOGO_OFICIAL_URL);

        Barbearia persistida = barbearias.findFirstByOrderByIdAsc().orElseThrow();
        assertThat(persistida.logo).isEqualTo(legado);
    }

    @Test
    void uploadPersonalizadoERemocaoDoAdministradorSaoPreservados() throws Exception {
        byte[] pngUpload = criarPngMinimo();
        var enviado = marcaService.enviarLogo(new MockMultipartFile("arquivo", "x.png", "image/png", pngUpload));
        assertThat(enviado.logo()).startsWith("/api/publico/logo?v=");
        assertThat(enviado.logo()).isNotEqualTo(MarcaService.LOGO_OFICIAL_URL);

        var publico = req("GET", "/publico/barbearia", null, null);
        assertThat(publico.codigo()).isEqualTo(200);
        assertThat(publico.corpo().path("logo").asText()).isEqualTo(enviado.logo());

        String admin = token("admin", "AdminDemo@2026");
        var tema = req("PUT", "/barbearia/tema", admin,
                json.writeValueAsString(Map.of("corFundo", "#0B1220", "corDestaque", "#2563EB")));
        assertThat(tema.codigo()).isEqualTo(200);
        assertThat(tema.corpo().path("logo").asText()).isEqualTo(enviado.logo());

        var removido = marcaService.removerLogo();
        assertThat(removido.logo()).isNull();

        var aposRemocao = req("GET", "/publico/barbearia", null, null);
        assertThat(aposRemocao.codigo()).isEqualTo(200);
        assertThat(aposRemocao.corpo().path("logo").isNull()).isTrue();
    }

    private byte[] criarPngMinimo() throws Exception {
        BufferedImage img = new BufferedImage(3, 3, BufferedImage.TYPE_INT_ARGB);
        var out = new ByteArrayOutputStream();
        ImageIO.write(img, "png", out);
        return out.toByteArray();
    }

    private String token(String usuario, String senha) throws Exception {
        var r = req("POST", "/login", null, json.writeValueAsString(Map.of("username", usuario, "senha", senha)));
        assertThat(r.codigo()).isEqualTo(200);
        return r.corpo().path("token").asText();
    }

    private HttpResponse<byte[]> reqBytes(String path) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + porta + "/api" + path)).GET();
        return http.send(b.build(), HttpResponse.BodyHandlers.ofByteArray());
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
