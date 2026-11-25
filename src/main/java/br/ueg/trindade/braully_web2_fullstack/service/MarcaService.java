package br.ueg.trindade.braully_web2_fullstack.service;

import java.io.IOException;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.constraints.*;
import br.ueg.trindade.braully_web2_fullstack.model.Barbearia;
import br.ueg.trindade.braully_web2_fullstack.model.Servico;

@Service
@Transactional
public class MarcaService {
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
    public record Marca(String nome, String descricao, String endereco, String telefone, String corDestaque,
                        String corFundo, String logo, boolean demonstracao, boolean fidelidadeAtiva, int meta,
                        Long premioId, String nomePremio, int antecedenciaMinutos, String instagram, String whatsapp) {}
    public record Imagem(byte[] bytes, String tipo) {}

    private Marca view(Barbearia b) {
        String imagem = b.logo == null ? null : "/api/publico/logo?v=" + b.versaoLogo;
        return new Marca(b.nome, b.descricao, b.endereco, b.telefone, b.corDestaque, b.corFundo,
                imagem, b.demonstracao, b.fidelidadeAtiva, b.meta,
                b.premio == null ? null : b.premio.getId(), b.premio == null ? null : b.premio.getNome(), b.antecedenciaMinutos, b.instagram, b.whatsapp);
    }

    @Transactional(readOnly = true)
    public Marca atual() { return view(instalacao.atual()); }

    @Transactional(readOnly = true)
    public Imagem logo() {
        Barbearia b = instalacao.atual();
        if (b.logo == null) throw Regra.inexistente();
        return new Imagem(b.logo, b.tipoLogo);
    }

    public Marca atualizar(Entrada e) {
        Barbearia b = instalacao.bloquear();
        Servico premio = e.premioId() == null ? null : catalogo.servico(e.premioId());
        if (e.fidelidadeAtiva() && (premio == null || !premio.ativo)) {
            throw Regra.invalida("Escolha um serviço ativo como recompensa.");
        }
        b.nome = e.nome().strip();
        b.descricao = e.descricao();
        b.endereco = e.endereco();
        b.telefone = e.telefone();
        if (e.instagram() != null) b.instagram = e.instagram();
        if (e.whatsapp() != null) b.whatsapp = e.whatsapp();
        b.corDestaque = e.corDestaque();
        b.corFundo = e.corFundo();
        b.demonstracao = e.demonstracao();
        b.fidelidadeAtiva = e.fidelidadeAtiva();
        b.meta = e.meta();
        b.premio = premio;
        b.antecedenciaMinutos = e.antecedenciaMinutos();
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
