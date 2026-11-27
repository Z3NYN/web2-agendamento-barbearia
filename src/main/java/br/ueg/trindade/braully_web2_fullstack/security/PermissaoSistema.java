package br.ueg.trindade.braully_web2_fullstack.security;

import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import br.ueg.trindade.braully_web2_fullstack.model.Permissao;

/**
 * Catálogo canônico de perfis e permissões operacionais com vínculo direto
 * às capacidades reais implementadas no sistema.
 */
public enum PermissaoSistema {
    // Perfis padrão do sistema
    ADMIN("ADMIN", "Administrador", "Acesso administrativo completo a todos os módulos, configurações e governança.", "PERFIL", "PERFIL", 1),
    BARBEIRO("BARBEIRO", "Profissional (Barbeiro)", "Acompanha e atualiza os próprios atendimentos vinculados ao perfil profissional.", "PERFIL", "PERFIL", 2),
    CLIENTE("CLIENTE", "Cliente", "Realiza reservas, consulta os próprios agendamentos e acompanha a própria fidelidade.", "PERFIL", "PERFIL", 3),

    // Capacidades operacionais granulares
    DASHBOARD_ANALITICO("DASHBOARD_ANALITICO", "Visualizar painel e indicadores", "Acessa o painel executivo, métricas de desempenho, ocupação, rankings e visão consolidada de clientes e fidelidade.", "OPERACAO", "PERMISSAO", 9),
    AGENDAMENTOS_CONSULTAR("AGENDAMENTOS_CONSULTAR", "Consultar agenda e painel", "Visualiza a agenda operacional completa da equipe e os indicadores do painel.", "OPERACAO", "PERMISSAO", 10),
    AGENDAMENTOS_GERENCIAR("AGENDAMENTOS_GERENCIAR", "Gerenciar agendamentos", "Cria agendamentos para clientes, reagenda com troca de profissional e cancela horários da equipe.", "OPERACAO", "PERMISSAO", 11),
    AGENDAMENTOS_CONFIRMAR_CONCLUIR("AGENDAMENTOS_CONFIRMAR_CONCLUIR", "Confirmar e concluir atendimentos", "Confirma reservas, conclui atendimentos encerrados e registra faltas na agenda.", "OPERACAO", "PERMISSAO", 12),
    CLIENTES_GERENCIAR("CLIENTES_GERENCIAR", "Consultar clientes e fichas", "Consulta a lista de clientes cadastrados, dados básicos e histórico de atendimentos.", "OPERACAO", "PERMISSAO", 13),
    FIDELIDADE_ADMINISTRAR("FIDELIDADE_ADMINISTRAR", "Administrar fidelidade", "Consulta cartões fidelidade de clientes e configura meta, ativação e prêmio do programa.", "OPERACAO", "PERMISSAO", 14),
    METAS_GERENCIAR("METAS_GERENCIAR", "Gerenciar metas do negócio", "Cria, edita e acompanha metas mensais de atendimentos, valor de serviços, clientes e ocupação.", "OPERACAO", "PERMISSAO", 15),

    SERVICOS_GERENCIAR("SERVICOS_GERENCIAR", "Gerenciar serviços", "Cadastra, edita, lista e desativa serviços, preços e durações.", "CATALOGO", "PERMISSAO", 20),
    PROFISSIONAIS_GERENCIAR("PROFISSIONAIS_GERENCIAR", "Gerenciar profissionais", "Cadastra, edita, vincula contas BARBEIRO e desativa profissionais.", "CATALOGO", "PERMISSAO", 21),
    DISPONIBILIDADE_GERENCIAR("DISPONIBILIDADE_GERENCIAR", "Gerenciar horários e bloqueios", "Configura expedientes semanais e bloqueios pontuais da barbearia e equipe.", "CATALOGO", "PERMISSAO", 22),

    MARCA_PERSONALIZAR("MARCA_PERSONALIZAR", "Personalizar marca e tema", "Edita dados comerciais, antecedência, logotipo e paleta de cores da interface.", "MARCA", "PERMISSAO", 30),
    GALERIA_GERENCIAR("GALERIA_GERENCIAR", "Gerenciar fotografias e galeria", "Envia e remove fotografias de abertura, banner, serviços, profissionais e galeria.", "MARCA", "PERMISSAO", 31),

    USUARIOS_GERENCIAR("USUARIOS_GERENCIAR", "Gerenciar usuários", "Lista, cria, edita, desativa e reativa contas de usuários no sistema.", "SISTEMA", "PERMISSAO", 40),
    PERMISSOES_GERENCIAR("PERMISSOES_GERENCIAR", "Gerenciar catálogo de permissões", "Consulta o catálogo oficial e edita títulos e descrições exibidos na interface.", "SISTEMA", "PERMISSAO", 41),
    ACESSOS_ATRIBUIR("ACESSOS_ATRIBUIR", "Atribuir perfis e permissões", "Atribui e revoga perfis e permissões operacionais nas contas de usuários.", "SISTEMA", "PERMISSAO", 42);

    public static final String PREFIXO_PAPEL = "ROLE_";
    public static final String PREFIXO_PERMISSAO = "PERM_";
    private static final Set<String> ESSENCIAIS_ADMIN = Set.of(
            "USUARIOS_GERENCIAR", "PERMISSOES_GERENCIAR", "ACESSOS_ATRIBUIR"
    );

    private static final Map<String, PermissaoSistema> POR_CODIGO = Arrays.stream(values())
            .collect(Collectors.toMap(PermissaoSistema::codigo, Function.identity()));

    private final String codigo;
    private final String tituloPadrao;
    private final String descricaoPadrao;
    private final String categoria;
    private final String tipo;
    private final int ordem;

    PermissaoSistema(String codigo, String tituloPadrao, String descricaoPadrao, String categoria, String tipo, int ordem) {
        this.codigo = codigo;
        this.tituloPadrao = tituloPadrao;
        this.descricaoPadrao = descricaoPadrao;
        this.categoria = categoria;
        this.tipo = tipo;
        this.ordem = ordem;
    }

    public String codigo() { return codigo; }
    public String tituloPadrao() { return tituloPadrao; }
    public String descricaoPadrao() { return descricaoPadrao; }
    public String categoria() { return categoria; }
    public String tipo() { return tipo; }
    public int ordem() { return ordem; }
    public boolean ehPerfil() { return "PERFIL".equals(tipo); }
    public String autoridade() { return PREFIXO_PERMISSAO + codigo; }

    public static Optional<PermissaoSistema> porCodigo(String nome) {
        if (nome == null) return Optional.empty();
        return Optional.ofNullable(POR_CODIGO.get(nome));
    }

    /**
     * Calcula os códigos efetivos (perfis + capacidades) a partir das permissões atribuídas.
     * ADMIN expande automaticamente para todas as capacidades operacionais do catálogo.
     */
    public static List<String> codigosEfetivos(Collection<Permissao> atribuidas) {
        if (atribuidas == null || atribuidas.isEmpty()) return List.of();
        Set<String> efetivos = new LinkedHashSet<>();
        boolean admin = false;
        for (Permissao p : atribuidas) {
            if (p == null || p.getNome() == null) continue;
            String nome = p.getNome();
            if ("ADMIN".equals(nome)) {
                admin = true;
            }
            if (POR_CODIGO.containsKey(nome)) {
                efetivos.add(nome);
            }
        }
        if (admin) {
            for (PermissaoSistema item : values()) {
                if (!item.ehPerfil()) {
                    efetivos.add(item.codigo);
                }
            }
        }
        return efetivos.stream()
                .sorted(Comparator.comparingInt(c -> POR_CODIGO.get(c).ordem()))
                .toList();
    }

    /**
     * Constrói as autoridades Spring Security combinando perfis atribuídos (ROLE_*)
     * e capacidades operacionais efetivas (PERM_*).
     */
    public static Set<GrantedAuthority> construirAutoridades(Collection<Permissao> atribuidas) {
        Set<GrantedAuthority> autoridades = new LinkedHashSet<>();
        if (atribuidas == null) return autoridades;
        for (Permissao p : atribuidas) {
            if (p != null && p.getNome() != null && !p.getNome().isBlank()) {
                autoridades.add(new SimpleGrantedAuthority(PREFIXO_PAPEL + p.getNome()));
            }
        }
        for (String codigo : codigosEfetivos(atribuidas)) {
            PermissaoSistema item = POR_CODIGO.get(codigo);
            if (item != null && !item.ehPerfil()) {
                autoridades.add(new SimpleGrantedAuthority(PREFIXO_PERMISSAO + codigo));
            }
        }
        return autoridades;
    }

    /**
     * Garante que pelo menos um administrador ativo preserve acesso completo e de governança.
     */
    public static boolean possuiAcessoAdminEssencial(Collection<Permissao> atribuidas) {
        if (atribuidas == null || atribuidas.isEmpty()) return false;
        List<String> efetivos = codigosEfetivos(atribuidas);
        return efetivos.contains("ADMIN") && efetivos.containsAll(ESSENCIAIS_ADMIN);
    }

    public static List<String> capacidadesDoPerfil(String perfil) {
        if ("ADMIN".equals(perfil)) {
            return Arrays.stream(values()).filter(p -> !p.ehPerfil()).map(PermissaoSistema::codigo).toList();
        }
        return List.of();
    }
}
