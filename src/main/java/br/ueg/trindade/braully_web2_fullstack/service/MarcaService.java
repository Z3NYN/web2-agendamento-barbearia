package br.ueg.trindade.braully_web2_fullstack.service;

import java.io.IOException;
import java.util.Arrays;
import java.util.Locale;
import javax.imageio.ImageIO;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.constraints.*;
import br.ueg.trindade.braully_web2_fullstack.model.Barbearia;
import br.ueg.trindade.braully_web2_fullstack.model.Servico;

@Service
@Transactional
public class MarcaService {
    public static final String COR_FUNDO_PADRAO = "#111111";
    public static final String COR_DESTAQUE_PADRAO = "#C5B59B";
    public static final String LOGO_OFICIAL_URL = "/studio/marca.png";
    private static final double LUMINANCIA_MAXIMA_FUNDO = 0.085;

    private static final class LogoOficialRecursos {
        static final byte[] OFICIAL = carregar("demo/marca.png");
        static final byte[] LEGADO = carregar("demo/soldado.jpg");

        private static byte[] carregar(String caminho) {
            try {
                var recurso = new ClassPathResource(caminho);
                return recurso.exists() ? recurso.getContentAsByteArray() : new byte[0];
            } catch (IOException ex) {
                return new byte[0];
            }
        }
    }

    static boolean ehLogoOficial(byte[] logo) {
        if (logo == null) return false;
        if (LogoOficialRecursos.OFICIAL.length > 0
                && logo.length == LogoOficialRecursos.OFICIAL.length
                && Arrays.equals(logo, LogoOficialRecursos.OFICIAL)) {
            return true;
        }
        return LogoOficialRecursos.LEGADO.length > 0
                && logo.length == LogoOficialRecursos.LEGADO.length
                && Arrays.equals(logo, LogoOficialRecursos.LEGADO);
    }

    private final InstalacaoService instalacao;
    private final CatalogoService catalogo;

    public MarcaService(InstalacaoService instalacao, CatalogoService catalogo) {
        this.instalacao = instalacao;
        this.catalogo = catalogo;
    }

    public record Entrada(@NotBlank @Size(max = 100) String nome, @Size(max = 220) String descricao,
                          @Size(max = 220) String endereco, @Size(max = 40) String telefone,
                          @NotBlank @Pattern(regexp = "#[0-9a-fA-F]{6}") String corDestaque,
                          @NotBlank @Pattern(regexp = "#[0-9a-fA-F]{6}") String corFundo,
                          boolean demonstracao, boolean fidelidadeAtiva, @Min(1) @Max(100) int meta,
                          Long premioId, @Min(0) @Max(10080) int antecedenciaMinutos,
                          @Size(max = 30) @Pattern(regexp = "[a-zA-Z0-9._]*") String instagram,
                          @Size(max = 15) @Pattern(regexp = "(?:[1-9][0-9]{7,14})?") String whatsapp) {}
    public record EntradaTema(@NotBlank @Pattern(regexp = "#[0-9a-fA-F]{6}") String corDestaque,
                              @NotBlank @Pattern(regexp = "#[0-9a-fA-F]{6}") String corFundo) {}
    public record EntradaFidelidade(boolean fidelidadeAtiva, @Min(1) @Max(100) int meta, Long premioId) {}
    public record Marca(String nome, String descricao, String endereco, String telefone, String corDestaque,
                        String corFundo, String logo, boolean demonstracao, boolean fidelidadeAtiva, int meta,
                        Long premioId, String nomePremio, int antecedenciaMinutos, String instagram, String whatsapp) {}
    public record Imagem(byte[] bytes, String tipo) {}

    public static String normalizarHexValido(String valor, String padrao) {
        if (valor == null) return padrao;
        String limpo = valor.strip();
        return limpo.matches("#[0-9a-fA-F]{6}") ? limpo.toUpperCase(Locale.ROOT) : padrao;
    }

    public static double luminanciaRelativa(String hex) {
        int r = Integer.parseInt(hex.substring(1, 3), 16);
        int g = Integer.parseInt(hex.substring(3, 5), 16);
        int b = Integer.parseInt(hex.substring(5, 7), 16);
        return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
    }

    private static double canalLinear(int valor) {
        double v = valor / 255.0;
        return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }

    public static boolean ehFundoEscuroCompativel(String valor) {
        if (valor == null) return false;
        String limpo = valor.strip();
        return limpo.matches("#[0-9a-fA-F]{6}") && luminanciaRelativa(limpo) <= LUMINANCIA_MAXIMA_FUNDO;
    }

    private static String validarCorFundo(String valor) {
        String normalizada = normalizarHexValido(valor, null);
        if (normalizada == null || !ehFundoEscuroCompativel(normalizada)) {
            throw Regra.invalida("Escolha uma cor de fundo escura para manter o contraste editorial da interface (ex.: #111111).");
        }
        return normalizada;
    }

    private Marca view(Barbearia b) {
        String imagem = b.logo == null ? null : ehLogoOficial(b.logo) ? LOGO_OFICIAL_URL : "/api/publico/logo?v=" + b.versaoLogo;
        String corDestaque = normalizarHexValido(b.corDestaque, COR_DESTAQUE_PADRAO);
        String corFundo = ehFundoEscuroCompativel(b.corFundo)
                ? b.corFundo.strip().toUpperCase(Locale.ROOT)
                : COR_FUNDO_PADRAO;
        return new Marca(b.nome, b.descricao, b.endereco, b.telefone, corDestaque, corFundo,
                imagem, b.demonstracao, b.fidelidadeAtiva, b.meta,
                b.premio == null ? null : b.premio.getId(), b.premio == null ? null : b.premio.getNome(), b.antecedenciaMinutos, b.instagram, b.whatsapp);
    }

    @Transactional(readOnly = true)
    public Marca atual() { return view(instalacao.atual()); }

    @Transactional(readOnly = true)
    public Imagem logo() {
        Barbearia b = instalacao.atual();
        if (b.logo == null) throw Regra.inexistente();
        if (ehLogoOficial(b.logo) && LogoOficialRecursos.OFICIAL.length > 0) {
            return new Imagem(LogoOficialRecursos.OFICIAL, "image/png");
        }
        return new Imagem(b.logo, b.tipoLogo);
    }

    public Marca atualizar(Entrada e) {
        return atualizar(e, true);
    }

    public Marca atualizar(Entrada e, boolean alteraFidelidade) {
        String corFundo = validarCorFundo(e.corFundo());
        String corDestaque = normalizarHexValido(e.corDestaque(), COR_DESTAQUE_PADRAO);
        Barbearia b = instalacao.bloquear();
        b.nome = e.nome().strip();
        b.descricao = e.descricao();
        b.endereco = e.endereco();
        b.telefone = e.telefone();
        if (e.instagram() != null) b.instagram = e.instagram();
        if (e.whatsapp() != null) b.whatsapp = e.whatsapp();
        b.corDestaque = corDestaque;
        b.corFundo = corFundo;
        b.demonstracao = e.demonstracao();
        b.antecedenciaMinutos = e.antecedenciaMinutos();
        if (alteraFidelidade) {
            aplicarFidelidade(b, e.fidelidadeAtiva(), e.meta(), e.premioId());
        }
        return view(b);
    }

    public Marca atualizarFidelidade(EntradaFidelidade e) {
        Barbearia b = instalacao.bloquear();
        aplicarFidelidade(b, e.fidelidadeAtiva(), e.meta(), e.premioId());
        return view(b);
    }

    private void aplicarFidelidade(Barbearia b, boolean ativa, int meta, Long premioId) {
        Servico premio = premioId == null ? null : catalogo.servico(premioId);
        if (ativa && (premio == null || !premio.ativo)) {
            throw Regra.invalida("Escolha um serviço ativo como recompensa.");
        }
        b.fidelidadeAtiva = ativa;
        b.meta = meta;
        b.premio = premio;
    }

    /**
     * Atualiza exclusivamente as cores do tema da marca sem alterar configurações operacionais,
     * modo demonstração, logotipo, fotografias ou regras de fidelidade.
     */
    public Marca atualizarTema(EntradaTema e) {
        String corFundo = validarCorFundo(e.corFundo());
        String corDestaque = normalizarHexValido(e.corDestaque(), COR_DESTAQUE_PADRAO);
        Barbearia b = instalacao.bloquear();
        b.corDestaque = corDestaque;
        b.corFundo = corFundo;
        return view(b);
    }

    public Marca enviarLogo(MultipartFile arquivo) throws IOException {
        Imagem imagem = validarImagem(arquivo);
        Barbearia b = instalacao.bloquear();
        b.logo = imagem.bytes();
        b.tipoLogo = imagem.tipo();
        b.versaoLogo++;
        return view(b);
    }

    static Imagem validarImagem(MultipartFile arquivo) throws IOException {
        if (arquivo.isEmpty() || arquivo.getSize() > 2_097_152) throw Regra.invalida("Selecione uma imagem de até 2 MB.");
        try (var entrada = arquivo.getInputStream(); var imagem = ImageIO.createImageInputStream(entrada)) {
            var leitores = ImageIO.getImageReaders(imagem);
            if (!leitores.hasNext()) throw Regra.invalida("Envie um PNG ou JPEG válido.");
            var leitor = leitores.next();
            try {
                leitor.setInput(imagem);
                String formato = leitor.getFormatName();
                if (!(formato.equalsIgnoreCase("JPEG") || formato.equalsIgnoreCase("PNG"))
                        || leitor.getWidth(0) > 5000 || leitor.getHeight(0) > 5000) {
                    throw Regra.invalida("Use um PNG ou JPEG com até 5000 pixels por lado.");
                }
                // Decodifica e reencoda para armazenar somente a imagem validada.
                var resultado = new java.io.ByteArrayOutputStream();
                ImageIO.write(leitor.read(0), formato, resultado);
                if (resultado.size() == 0 || resultado.size() > 2_097_152) throw Regra.invalida("A imagem processada excede 2 MB.");
                return new Imagem(resultado.toByteArray(), formato.equalsIgnoreCase("PNG") ? "image/png" : "image/jpeg");
            } finally {
                leitor.dispose();
            }
        } catch (javax.imageio.IIOException ex) {
            throw Regra.invalida("A imagem está danificada ou incompleta.");
        }
    }

    public Marca removerLogo() {
        Barbearia b = instalacao.bloquear();
        b.logo = null;
        b.tipoLogo = null;
        b.versaoLogo++;
        return view(b);
    }
}
