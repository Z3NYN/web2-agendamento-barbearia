package br.ueg.trindade.braully_web2_fullstack.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .headers(headers -> headers
                        .frameOptions(frame -> frame.deny())
                        .contentSecurityPolicy(policy -> policy.policyDirectives(
                            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, erro) -> responder(res, 401, "Entre na sua conta para continuar."))
                        .accessDeniedHandler((req, res, erro) -> responder(res, 403, "Você não tem permissão para esta operação.")))
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ASYNC, jakarta.servlet.DispatcherType.ERROR).permitAll()
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/publico/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/login", "/api/cadastro").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/usuarios/clientes/**").hasAnyAuthority(
                                "PERM_CLIENTES_GERENCIAR", "PERM_AGENDAMENTOS_GERENCIAR", "PERM_FIDELIDADE_ADMINISTRAR")
                        .requestMatchers(HttpMethod.GET, "/api/usuarios/barbeiros").hasAuthority("PERM_PROFISSIONAIS_GERENCIAR")
                        .requestMatchers(HttpMethod.GET, "/api/usuarios", "/api/usuarios/*/permissoes").hasAnyAuthority(
                                "PERM_USUARIOS_GERENCIAR", "PERM_ACESSOS_ATRIBUIR")
                        .requestMatchers(HttpMethod.PUT, "/api/usuarios/*/permissoes").hasAuthority("PERM_ACESSOS_ATRIBUIR")
                        .requestMatchers("/api/usuarios/**").hasAuthority("PERM_USUARIOS_GERENCIAR")
                        .requestMatchers(HttpMethod.GET, "/api/permissoes/**").hasAnyAuthority(
                                "PERM_PERMISSOES_GERENCIAR", "PERM_ACESSOS_ATRIBUIR")
                        .requestMatchers("/api/permissoes/**").hasAuthority("PERM_PERMISSOES_GERENCIAR")
                        .requestMatchers(HttpMethod.GET, "/api/servicos/**").hasAnyAuthority(
                                "PERM_SERVICOS_GERENCIAR", "PERM_FIDELIDADE_ADMINISTRAR", "PERM_MARCA_PERSONALIZAR")
                        .requestMatchers("/api/servicos/**").hasAuthority("PERM_SERVICOS_GERENCIAR")
                        .requestMatchers(HttpMethod.GET, "/api/barbeiros/**").hasAnyAuthority(
                                "PERM_PROFISSIONAIS_GERENCIAR", "PERM_DISPONIBILIDADE_GERENCIAR")
                        .requestMatchers("/api/barbeiros/**").hasAuthority("PERM_PROFISSIONAIS_GERENCIAR")
                        .requestMatchers("/api/expedientes/**", "/api/bloqueios/**").hasAuthority("PERM_DISPONIBILIDADE_GERENCIAR")
                        .requestMatchers(HttpMethod.PUT, "/api/barbearia/fidelidade").hasAuthority("PERM_FIDELIDADE_ADMINISTRAR")
                        .requestMatchers("/api/barbearia/**").hasAuthority("PERM_MARCA_PERSONALIZAR")
                        .requestMatchers("/api/fotos/**").hasAuthority("PERM_GALERIA_GERENCIAR")
                        .requestMatchers(HttpMethod.GET, "/api/metas/**").hasAnyAuthority("PERM_DASHBOARD_ANALITICO", "PERM_METAS_GERENCIAR")
                        .requestMatchers("/api/metas/**").hasAuthority("PERM_METAS_GERENCIAR")
                        .requestMatchers("/api/clientes/retencao/**").hasAuthority("PERM_CLIENTES_GERENCIAR")
                        .requestMatchers("/api/painel/**").hasAuthority("PERM_DASHBOARD_ANALITICO")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private static void responder(jakarta.servlet.http.HttpServletResponse res, int status, String texto)
            throws java.io.IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"erro\":\"" + texto + "\"}");
    }

    // O JwtFilter é um @Component: sem isto o Boot também o registraria no
    // encadeamento de servlets e ele rodaria duas vezes por requisição.
    @Bean
    public FilterRegistrationBean<JwtFilter> jwtFilterRegistration(JwtFilter filter) {
        FilterRegistrationBean<JwtFilter> registro = new FilterRegistrationBean<>(filter);
        registro.setEnabled(false);
        return registro;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuracao = new CorsConfiguration();
        configuracao.setAllowedOrigins(List.of("http://localhost:5173", "http://127.0.0.1:5173"));
        configuracao.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuracao.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource origem = new UrlBasedCorsConfigurationSource();
        origem.registerCorsConfiguration("/**", configuracao);
        return origem;
    }
}
