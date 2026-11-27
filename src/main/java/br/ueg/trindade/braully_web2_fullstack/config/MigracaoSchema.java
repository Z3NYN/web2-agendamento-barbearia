package br.ueg.trindade.braully_web2_fullstack.config;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.sql.DataSource;

import jakarta.persistence.EntityManagerFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Executa migrações obrigatórias de esquema antes da inicialização do Hibernate/JPA,
 * garantindo defaults em banco e comportamento idempotente para bases novas, legadas ou parciais.
 */
@Configuration
public class MigracaoSchema {

    private static final Logger log = LoggerFactory.getLogger(MigracaoSchema.class);
    public static final String BEAN_MIGRACAO = "migracaoSchemaRunner";

    private record ColunaObrigatoria(String nome, boolean padrao) {}
    private record InfoColuna(boolean anulavel, String valorPadrao) {}

    private static final List<ColunaObrigatoria> COLUNAS_USUARIO_NOTIF = List.of(
            new ColunaObrigatoria("notif_sistema", true),
            new ColunaObrigatoria("notif_push", false),
            new ColunaObrigatoria("notif_lembretes", true),
            new ColunaObrigatoria("notif_fidelidade", true)
    );

    @Bean
    static BeanFactoryPostProcessor garantirMigracaoAntesDoHibernate() {
        return new BeanFactoryPostProcessor() {
            @Override
            public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException {
                var alvos = new java.util.LinkedHashSet<String>();
                if (beanFactory.containsBeanDefinition("entityManagerFactory")) {
                    alvos.add("entityManagerFactory");
                }
                for (String nome : beanFactory.getBeanNamesForType(EntityManagerFactory.class, true, false)) {
                    alvos.add(nome);
                }
                for (String nome : beanFactory.getBeanDefinitionNames()) {
                    if (nome.toLowerCase(Locale.ROOT).contains("entitymanagerfactory")) {
                        alvos.add(nome);
                    }
                }
                for (String nomeBean : alvos) {
                    if (beanFactory.containsBeanDefinition(nomeBean)) {
                        adicionarDependencia(beanFactory.getBeanDefinition(nomeBean));
                    }
                }
            }
        };
    }

    private static void adicionarDependencia(BeanDefinition definicao) {
        String[] atuais = definicao.getDependsOn();
        if (atuais == null || atuais.length == 0) {
            definicao.setDependsOn(BEAN_MIGRACAO);
            return;
        }
        for (String dep : atuais) {
            if (BEAN_MIGRACAO.equals(dep)) {
                return;
            }
        }
        String[] atualizadas = new String[atuais.length + 1];
        System.arraycopy(atuais, 0, atualizadas, 0, atuais.length);
        atualizadas[atuais.length] = BEAN_MIGRACAO;
        definicao.setDependsOn(atualizadas);
    }

    @Bean(BEAN_MIGRACAO)
    InitializingBean migracaoSchemaRunner(DataSource dataSource) {
        return () -> executarMigracao(dataSource);
    }

    /**
     * Aplica e valida as colunas obrigatórias nas tabelas {@code usuario} e {@code permissao}.
     * Falha imediatamente em caso de erro de banco para impedir inicialização inconsistente.
     */
    public static void executarMigracao(DataSource dataSource) {
        try (Connection conn = dataSource.getConnection()) {
            String catalog = conn.getCatalog();
            String schema = conn.getSchema();
            DatabaseMetaData meta = conn.getMetaData();
            int alteracoes = 0;

            String tabelaUsuario = encontrarTabela(meta, catalog, schema, "usuario");
            if (tabelaUsuario == null) {
                log.info("Tabela usuario ainda não existe; Hibernate criará o esquema inicial com defaults.");
            } else {
                alteracoes += migrarTabelaUsuario(conn, meta, catalog, schema, tabelaUsuario);
            }

            String tabelaPermissao = encontrarTabela(meta, catalog, schema, "permissao");
            if (tabelaPermissao == null) {
                log.info("Tabela permissao ainda não existe; Hibernate criará o esquema inicial com defaults.");
            } else {
                alteracoes += migrarTabelaPermissao(conn, meta, catalog, schema, tabelaPermissao);
            }

            if (!conn.getAutoCommit()) {
                conn.commit();
            }
            log.info("Migração de esquema concluída ({} alterações aplicadas).", alteracoes);
        } catch (SQLException e) {
            throw new IllegalStateException("Falha crítica ao migrar esquema obrigatório.", e);
        }
    }

    private static int migrarTabelaUsuario(Connection conn, DatabaseMetaData meta, String catalog, String schema, String tabelaUsuario)
            throws SQLException {
        Map<String, InfoColuna> colunasExistentes = mapearColunas(meta, catalog, schema, tabelaUsuario);
        int alteracoes = 0;
        try (Statement stmt = conn.createStatement()) {
            for (ColunaObrigatoria coluna : COLUNAS_USUARIO_NOTIF) {
                String literal = coluna.padrao() ? "TRUE" : "FALSE";
                InfoColuna info = colunasExistentes.get(coluna.nome());
                if (info == null) {
                    stmt.execute("ALTER TABLE usuario ADD COLUMN " + coluna.nome()
                            + " BOOLEAN DEFAULT " + literal + " NOT NULL");
                    alteracoes++;
                } else {
                    if (info.anulavel()) {
                        stmt.execute("UPDATE usuario SET " + coluna.nome() + " = " + literal
                                + " WHERE " + coluna.nome() + " IS NULL");
                    }
                    if (info.valorPadrao() == null || info.valorPadrao().isBlank()) {
                        stmt.execute("ALTER TABLE usuario ALTER COLUMN " + coluna.nome()
                                + " SET DEFAULT " + literal);
                        alteracoes++;
                    }
                    if (info.anulavel()) {
                        stmt.execute("ALTER TABLE usuario ALTER COLUMN " + coluna.nome()
                                + " SET NOT NULL");
                        alteracoes++;
                    }
                }
            }
            if (!colunasExistentes.containsKey("criado_em")) {
                stmt.execute("ALTER TABLE usuario ADD COLUMN criado_em TIMESTAMP");
                alteracoes++;
            }
            stmt.executeQuery(
                    "SELECT notif_sistema, notif_push, notif_lembretes, notif_fidelidade, criado_em FROM usuario WHERE 1 = 0")
                    .close();
        }
        return alteracoes;
    }

    private static int migrarTabelaPermissao(Connection conn, DatabaseMetaData meta, String catalog, String schema, String tabelaPermissao)
            throws SQLException {
        Map<String, InfoColuna> colunas = mapearColunas(meta, catalog, schema, tabelaPermissao);
        int alteracoes = 0;
        try (Statement stmt = conn.createStatement()) {
            if (!colunas.containsKey("titulo")) {
                stmt.execute("ALTER TABLE permissao ADD COLUMN titulo VARCHAR(120)");
                alteracoes++;
            }
            if (!colunas.containsKey("categoria")) {
                stmt.execute("ALTER TABLE permissao ADD COLUMN categoria VARCHAR(40)");
                alteracoes++;
            }
            InfoColuna tipoInfo = colunas.get("tipo");
            if (tipoInfo == null) {
                stmt.execute("ALTER TABLE permissao ADD COLUMN tipo VARCHAR(20) DEFAULT 'PERMISSAO' NOT NULL");
                alteracoes++;
            } else {
                if (tipoInfo.anulavel()) {
                    stmt.execute("UPDATE permissao SET tipo = CASE WHEN UPPER(nome) IN ('ADMIN', 'BARBEIRO', 'CLIENTE') THEN 'PERFIL' ELSE 'PERMISSAO' END WHERE tipo IS NULL");
                }
                if (tipoInfo.valorPadrao() == null || tipoInfo.valorPadrao().isBlank()) {
                    stmt.execute("ALTER TABLE permissao ALTER COLUMN tipo SET DEFAULT 'PERMISSAO'");
                    alteracoes++;
                }
                if (tipoInfo.anulavel()) {
                    stmt.execute("ALTER TABLE permissao ALTER COLUMN tipo SET NOT NULL");
                    alteracoes++;
                }
            }
            InfoColuna sistemaInfo = colunas.get("sistema");
            if (sistemaInfo == null) {
                stmt.execute("ALTER TABLE permissao ADD COLUMN sistema BOOLEAN DEFAULT FALSE NOT NULL");
                alteracoes++;
            } else {
                if (sistemaInfo.anulavel()) {
                    stmt.execute("UPDATE permissao SET sistema = FALSE WHERE sistema IS NULL");
                }
                if (sistemaInfo.valorPadrao() == null || sistemaInfo.valorPadrao().isBlank()) {
                    stmt.execute("ALTER TABLE permissao ALTER COLUMN sistema SET DEFAULT FALSE");
                    alteracoes++;
                }
                if (sistemaInfo.anulavel()) {
                    stmt.execute("ALTER TABLE permissao ALTER COLUMN sistema SET NOT NULL");
                    alteracoes++;
                }
            }
            stmt.executeQuery("SELECT titulo, categoria, tipo, sistema FROM permissao WHERE 1 = 0").close();
        }
        return alteracoes;
    }

    private static String encontrarTabela(DatabaseMetaData meta, String catalog, String schema, String alvo)
            throws SQLException {
        try (ResultSet rs = meta.getTables(catalog, schema, "%", new String[]{"TABLE", "BASE TABLE"})) {
            while (rs.next()) {
                String nome = rs.getString("TABLE_NAME");
                if (alvo.equalsIgnoreCase(nome)) {
                    return nome;
                }
            }
        }
        return null;
    }

    private static Map<String, InfoColuna> mapearColunas(
            DatabaseMetaData meta, String catalog, String schema, String tabela) throws SQLException {
        Map<String, InfoColuna> colunas = new HashMap<>();
        try (ResultSet rs = meta.getColumns(catalog, schema, tabela, "%")) {
            while (rs.next()) {
                String nome = rs.getString("COLUMN_NAME");
                if (nome != null) {
                    boolean anulavel = !"NO".equalsIgnoreCase(rs.getString("IS_NULLABLE"));
                    String padrao = rs.getString("COLUMN_DEF");
                    colunas.put(nome.toLowerCase(Locale.ROOT), new InfoColuna(anulavel, padrao));
                }
            }
        }
        return colunas;
    }
}
