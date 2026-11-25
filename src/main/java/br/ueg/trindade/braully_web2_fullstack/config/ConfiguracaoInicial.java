package br.ueg.trindade.braully_web2_fullstack.config;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.*;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.model.Agendamento.Status;
import br.ueg.trindade.braully_web2_fullstack.repository.*;
import br.ueg.trindade.braully_web2_fullstack.service.*;

@Configuration
public class ConfiguracaoInicial {
    @Bean
    CommandLineRunner carregarDados(DadosIniciais dados) { return args -> dados.inicializar(); }
}

@Service
class DadosIniciais {
    private final BarbeariaRepository barbearias;
    private final PermissaoRepository permissoes;
    private final UsuarioService usuarios;
    private final CatalogoService catalogo;
    private final AgendamentoRepository agenda;
    private final ExpedienteRepository expedientes;
    private final FidelidadeService fidelidade;

    @Value("${app.demo}") private boolean demo;
    @Value("${app.admin-password}") private String senhaAdmin;

    DadosIniciais(BarbeariaRepository barbearias, PermissaoRepository permissoes, UsuarioService usuarios,
                 CatalogoService catalogo, AgendamentoRepository agenda, ExpedienteRepository expedientes,
                 FidelidadeService fidelidade) {
        this.barbearias = barbearias;
        this.permissoes = permissoes;
        this.usuarios = usuarios;
        this.catalogo = catalogo;
        this.agenda = agenda;
        this.expedientes = expedientes;
        this.fidelidade = fidelidade;
    }

    @Transactional(rollbackFor = IOException.class)
    public void inicializar() throws IOException {
        if (barbearias.count() > 0) return;
        if (!demo && senhaAdmin.isBlank()) {
            throw new IllegalStateException("Para uma instalação nova sem demonstração, defina SOLDADO_ADMIN_PASSWORD.");
        }
        papel("ADMIN", "Administra a barbearia.");
        papel("BARBEIRO", "Acompanha os próprios atendimentos.");
        papel("CLIENTE", "Agenda e consulta os próprios dados.");
        var b = new Barbearia();
        b.nome = demo ? "Studio Soldado do Corte" : "Minha barbearia";
        b.descricao = "Escolha o serviço, o profissional e um horário disponível.";
        b.corDestaque = "#e6c89b";
        b.corFundo = "#0d0d0d";
        b.meta = 10;
        b.antecedenciaMinutos = 120;
        b.demonstracao = demo;
        barbearias.saveAndFlush(b);
        conta(demo ? "Administração Demo" : "Administração", "admin", demo ? "AdminDemo@2026" : senhaAdmin, "ADMIN");
        if (demo) demonstracao(b);
    }

    private void papel(String nome, String descricao) {
        if (permissoes.findByNome(nome).isEmpty()) permissoes.save(new Permissao(nome, descricao));
    }

    private Usuario conta(String nome, String username, String senha, String papel) {
        return usuarios.criarConta(new UsuarioService.Entrada(nome, username, username + "@exemplo.test", senha), papel);
    }

    private void demonstracao(Barbearia loja) throws IOException {
        try (var imagem = new ClassPathResource("demo/soldado.jpg").getInputStream()) {
            loja.logo = imagem.readAllBytes();
            loja.tipoLogo = "image/jpeg";
            loja.versaoLogo = 1;
        }
        var cliente = conta("Alex Demo", "cliente", "ClienteDemo@2026", "CLIENTE");
        var conta1 = conta("Rafa Demo", "barbeiro", "BarbeiroDemo@2026", "BARBEIRO");
        var conta2 = conta("Luiz Demo", "luiz", "LuizDemo@2026", "BARBEIRO");
        var corte = catalogo.servico(catalogo.gravar(null, new CatalogoService.EntradaServico(
                "Corte clássico", "Acabamento na máquina ou tesoura.", new BigDecimal("45.00"), 30, true, true)).id());
        catalogo.gravar(null, new CatalogoService.EntradaServico(
                "Barba", "Modelagem e acabamento.", new BigDecimal("30.00"), 30, true, true));
        catalogo.gravar(null, new CatalogoService.EntradaServico(
                "Corte e barba", "Corte completo com modelagem da barba.", new BigDecimal("65.00"), 60, true, true));
        var rafa = catalogo.barbeiro(catalogo.gravar(null, new CatalogoService.EntradaBarbeiro(
                "Rafa Demo", "Degradê, corte clássico e finalização", conta1.getId(), true)).id());
        var luiz = catalogo.barbeiro(catalogo.gravar(null, new CatalogoService.EntradaBarbeiro(
                "Luiz Demo", "Barba desenhada e cortes com tesoura", conta2.getId(), true)).id());
        loja.premio = corte;
        loja.fidelidadeAtiva = true;
        for (var dia : DayOfWeek.values()) {
            expediente(loja, null, dia);
            for (var profissional : Set.of(rafa, luiz)) expediente(loja, profissional, dia);
        }
        var agora = Regra.agora().withSecond(0).withNano(0);
        for (int dias = 9; dias >= 1; dias--) {
            var a = reserva(cliente, rafa, corte, agora.toLocalDate().minusDays(dias).atTime(10, 0), Status.CONCLUIDO);
            fidelidade.concluir(loja, a, a.fim);
        }
        reserva(cliente, rafa, corte, agora.minusMinutes(45), Status.CONFIRMADO);
    }

    private void expediente(Barbearia loja, Barbeiro profissional, DayOfWeek dia) {
        var e = new Expediente();
        e.barbearia = loja;
        e.barbeiro = profissional;
        e.dia = dia;
        e.inicio = LocalTime.of(9, 0);
        e.fim = LocalTime.of(19, 0);
        expedientes.save(e);
    }

    private Agendamento reserva(Usuario cliente, Barbeiro barbeiro, Servico servico, LocalDateTime inicio, Status status) {
        var a = new Agendamento();
        a.cliente = cliente;
        a.barbeiro = barbeiro;
        a.servico = servico;
        a.nomeServico = servico.nome;
        a.elegivelNaReserva = true;
        a.preco = servico.preco;
        a.inicio = inicio;
        a.fim = inicio.plusMinutes(servico.duracaoMinutos);
        a.status = status;
        return agenda.save(a);
    }
}
