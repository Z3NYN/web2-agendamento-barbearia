package br.ueg.trindade.braully_web2_fullstack.service;

import br.ueg.trindade.braully_web2_fullstack.model.Foto;
import br.ueg.trindade.braully_web2_fullstack.repository.FotoRepository;
import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class FotoService {
    private final FotoRepository fotos;
    private final InstalacaoService instalacao;
    private final CatalogoService catalogo;

    public FotoService(FotoRepository fotos, InstalacaoService instalacao, CatalogoService catalogo) {
        this.fotos = fotos;
        this.instalacao = instalacao;
        this.catalogo = catalogo;
    }

    public record FotoView(UUID id, Foto.Alvo alvo, Long cadastroId, String legenda, String categoria, String url) {}

    private FotoView view(UUID id, Foto.Alvo alvo, Long cadastroId, String legenda, String categoria) {
        return new FotoView(id, alvo, cadastroId, legenda, categoria, "/api/publico/fotos/" + id);
    }

    @Transactional(readOnly = true)
    public List<FotoView> listar() {
        return fotos.metadados(instalacao.atual().id).stream()
            .map(f -> view(f.getId(), f.getAlvo(), f.getCadastroId(), f.getLegenda(), f.getCategoria())).toList();
    }

    @Transactional(readOnly = true)
    public MarcaService.Imagem buscar(UUID id) {
        Foto foto = fotos.findById(id).orElseThrow(Regra::inexistente);
        return new MarcaService.Imagem(foto.conteudo, foto.tipo);
    }

    public FotoView salvar(Foto.Alvo alvo, Long cadastro, String legenda, String categoria, MultipartFile arquivo) throws IOException {
        if ((alvo == Foto.Alvo.SERVICO || alvo == Foto.Alvo.BARBEIRO) != (cadastro != null))
            throw Regra.invalida("Selecione um cadastro válido para a foto.");
        if (legenda != null && legenda.length() > 120) throw Regra.invalida("Use uma legenda de até 120 caracteres.");
        var imagem = MarcaService.validarImagem(arquivo);
        var loja = instalacao.bloquear();
        if (alvo == Foto.Alvo.SERVICO) catalogo.servico(cadastro);
        if (alvo == Foto.Alvo.BARBEIRO) catalogo.barbeiro(cadastro);
        var existentes = fotos.metadados(loja.id).stream()
            .filter(f -> f.getAlvo() == alvo && Objects.equals(f.getCadastroId(), cadastro)).toList();
        if (alvo == Foto.Alvo.GALERIA && existentes.size() >= 12)
            throw Regra.invalida("A galeria comporta até 12 fotos.");
        if (alvo != Foto.Alvo.GALERIA) existentes.forEach(f -> fotos.deleteById(f.getId()));
        var foto = new Foto();
        foto.barbearia = loja;
        foto.alvo = alvo;
        foto.cadastroId = cadastro;
        foto.legenda = legenda;
        if (alvo == Foto.Alvo.GALERIA) {
            if (categoria != null && !java.util.Set.of("Cortes", "Barba", "Ambiente", "Outros").contains(categoria))
                throw Regra.invalida("Selecione uma categoria de galeria válida.");
            foto.categoria = categoria == null ? "Outros" : categoria;
        }
        foto.tipo = imagem.tipo();
        foto.conteudo = imagem.bytes();
        fotos.save(foto);
        return view(foto.id, foto.alvo, foto.cadastroId, foto.legenda, foto.categoria);
    }

    public void remover(UUID id) {
        var loja = instalacao.bloquear();
        if (fotos.metadados(loja.id).stream().noneMatch(f -> f.getId().equals(id))) throw Regra.inexistente();
        fotos.deleteById(id);
    }
}
