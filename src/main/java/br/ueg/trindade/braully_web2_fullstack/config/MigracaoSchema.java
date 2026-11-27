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
     * Aplica e valida as colunas de preferência de notificação na tabela {@code usuario}.
     * Falha imediatamente em caso de erro de banco para impedir inicialização inconsistente.
     */
    public static void executarMigracao(DataSource dataSource) {
        try (Connection conn = dataSource.getConnection()) {
            String catalog = conn.getCatalog();
            String schema = conn.getSchema();
            DatabaseMetaData meta = conn.getMetaData();

            String tabelaUsuario = encontrarTabelaUsuario(meta, catalog, schema);
            if (tabelaUsuario == null) {
                log.info("Tabela usuario ainda não existe; Hibernate criará o esquema inicial com defaults.");
                return;
            }

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
                stmt.executeQuery(
                        "SELECT notif_sistema, notif_push, notif_lembretes, notif_fidelidade FROM usuario WHERE 1 = 0")
                        .close();
            }

            if (!conn.getAutoCommit()) {
                conn.commit();
            }
            log.info("Migração de esquema da tabela usuario concluída ({} alterações aplicadas).", alteracoes);
        } catch (SQLException e) {
            throw new IllegalStateException("Falha crítica ao migrar esquema obrigatório da tabela usuario.", e);
        }
    }

    private static String encontrarTabelaUsuario(DatabaseMetaData meta, String catalog, String schema)
            throws SQLException {
        try (ResultSet rs = meta.getTables(catalog, schema, "%", new String[]{"TABLE", "BASE TABLE"})) {
            while (rs.next()) {
                String nome = rs.getString("TABLE_NAME");
                if ("usuario".equalsIgnoreCase(nome)) {
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
