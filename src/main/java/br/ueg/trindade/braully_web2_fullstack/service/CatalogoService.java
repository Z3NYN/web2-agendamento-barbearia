package br.ueg.trindade.braully_web2_fullstack.service;

import java.math.BigDecimal;
import java.util.List;
import jakarta.validation.constraints.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.ueg.trindade.braully_web2_fullstack.model.*;
import br.ueg.trindade.braully_web2_fullstack.repository.*;

@Service
@Transactional
public class CatalogoService {
    private final InstalacaoService instalacao;
    private final ServicoRepository servicos;
    private final BarbeiroRepository barbeiros;
    private final UsuarioService usuarios;
    private final AgendamentoRepository agenda;
    private final MovimentoFidelidadeRepository movimentos;

    public CatalogoService(InstalacaoService instalacao, ServicoRepository servicos, BarbeiroRepository barbeiros,
                           UsuarioService usuarios, AgendamentoRepository agenda, MovimentoFidelidadeRepository movimentos) {
        this.instalacao = instalacao;
        this.servicos = servicos;
        this.barbeiros = barbeiros;
        this.usuarios = usuarios;
        this.agenda = agenda;
        this.movimentos = movimentos;
    }

    public record EntradaServico(@NotBlank @Size(max = 100) String nome, @Size(max = 240) String descricao,
                                 @NotNull @DecimalMin("0.00") @Digits(integer = 8, fraction = 2) BigDecimal preco,
                                 @Min(5) @Max(480) int duracaoMinutos, boolean elegivel, boolean ativo) {}
    public record ServicoView(Long id, String nome, String descricao, BigDecimal preco, int duracaoMinutos,
                              boolean elegivel, boolean ativo) {}
    public record EntradaBarbeiro(@NotBlank @Size(max = 100) String nome, @Size(max = 240) String descricao,
                                  Long usuarioId, boolean ativo) {}
    public record BarbeiroView(Long id, String nome, String descricao, Long usuarioId, boolean ativo) {}

    private ServicoView view(Servico s) {
        return new ServicoView(s.id, s.nome, s.descricao, s.preco, s.duracaoMinutos, s.elegivel, s.ativo);
    }

    private BarbeiroView view(Barbeiro b, boolean publico) {
        return new BarbeiroView(b.id, b.nome, b.descricao, publico || b.usuario == null ? null : b.usuario.getId(), b.ativo);
    }

    @Transactional(readOnly = true)
    public List<ServicoView> servicos(boolean publico) {
        return servicos.findAllByOrderByNomeAsc().stream().filter(s -> !publico || s.ativo).map(this::view).toList();
    }

    @Transactional(readOnly = true)
    public List<BarbeiroView> barbeiros(boolean publico) {
        return barbeiros.findAllByOrderByNomeAsc().stream().filter(b -> !publico || b.ativo)
                .map(b -> view(b, publico)).toList();
    }

    public List<Barbeiro> barbeirosAtivos() {
        return barbeiros.findAllByOrderByNomeAsc().stream().filter(b -> b.ativo).toList();
    }

    @Transactional(readOnly = true)
    public ServicoView detalheServico(Long id) { return view(servico(id)); }

    @Transactional(readOnly = true)
    public BarbeiroView detalheBarbeiro(Long id) { return view(barbeiro(id), false); }

    public Servico servico(Long id) { return org.hibernate.Hibernate.unproxy(servicos.findById(id).orElseThrow(Regra::inexistente), Servico.class); }
    public Barbeiro barbeiro(Long id) { return org.hibernate.Hibernate.unproxy(barbeiros.findById(id).orElseThrow(Regra::inexistente), Barbeiro.class); }

    public ServicoView gravar(Long id, EntradaServico entrada) {
        Barbearia loja = instalacao.bloquear();
        Servico s = id == null ? new Servico() : servico(id);
        if (!entrada.ativo()) verificarPremio(loja, id);
        s.barbearia = loja;
        s.nome = entrada.nome().strip();
        s.descricao = entrada.descricao();
        s.preco = entrada.preco();
        s.duracaoMinutos = entrada.duracaoMinutos();
        s.elegivel = entrada.elegivel();
        s.ativo = entrada.ativo();
        return view(servicos.save(s));
    }

    public void excluirServico(Long id) {
        verificarPremio(instalacao.bloquear(), id);
        Servico s = servico(id);
        // O cadastro fica disponível para reativação e mantém o histórico.
        s.ativo = false;
    }

    private void verificarPremio(Barbearia loja, Long id) {
        if (id == null) return;
        if ((loja.fidelidadeAtiva && loja.premio != null && id.equals(loja.premio.getId()))
                || movimentos.existsByPremioIdAndResgatadoEmIsNull(id)) {
            throw Regra.conflito("O serviço é uma recompensa ativa ou já liberada. Troque a regra e utilize os benefícios emitidos antes de desativá-lo.");
        }
    }

    public BarbeiroView gravar(Long id, EntradaBarbeiro entrada) {
        Barbearia loja = instalacao.bloquear();
        Barbeiro b = id == null ? new Barbeiro() : barbeiro(id);
        Usuario conta = entrada.usuarioId() == null ? null : usuarios.buscar(entrada.usuarioId());
        if (conta != null) {
            if (!conta.isAtivo() || conta.getPermissoes().stream().noneMatch(p -> p.getNome().equals("BARBEIRO"))) {
                throw Regra.invalida("Selecione uma conta ativa com perfil BARBEIRO.");
            }
            if (barbeiros.existsByUsuarioIdAndIdNot(conta.getId(), id == null ? -1L : id)) {
                throw Regra.conflito("Essa conta já pertence a outro profissional.");
            }
        }
        if (!entrada.ativo() && b.ativo && b.id != null) validarDesativacao(b.id);
        b.barbearia = loja;
        b.usuario = conta;
        b.nome = entrada.nome().strip();
        b.descricao = entrada.descricao();
        b.ativo = entrada.ativo();
        return view(barbeiros.save(b), false);
    }

    public void excluirBarbeiro(Long id) {
        instalacao.bloquear();
        Barbeiro b = barbeiro(id);
        validarDesativacao(id);
        b.ativo = false;
    }

    private void validarDesativacao(Long id) {
        var agora = Regra.agora();
        boolean temReserva = agenda.findByBarbeiroIdAndInicioLessThanAndFimGreaterThan(id, agora.plusYears(20), agora)
                .stream().anyMatch(a -> a.status == Agendamento.Status.RESERVADO || a.status == Agendamento.Status.CONFIRMADO);
        if (temReserva) throw Regra.conflito("Reagende ou cancele os próximos atendimentos antes de desativar o profissional.");
    }
}
