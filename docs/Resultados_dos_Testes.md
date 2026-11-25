# Resultados dos testes

Validação em 13/11/2026. Ambiente Linux x64 com Java 21, Maven 3.9.12, Node.js 24 e Chromium Headless via Playwright.

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Build do React, TypeScript e lint | Aprovado | npm run build e npm run lint. Fontes, estilos e scripts estão no build local. |
| Build Spring Boot e JAR executável | Aprovado | Maven package com o plugin Spring Boot. O JAR inicializou e serviu página e API pela mesma porta. |
| Autenticação e autorização | Aprovado | JUnit validou login, senha incorreta, token inválido, token expirado, logout, 401, 403 e ausência da senha no perfil. |
| Cadastros | Aprovado | JUnit passou por campos obrigatórios, criação, consulta, edição e desativação de serviço/profissional, além de CRUD de permissão. |
| Agendamento | Aprovado | JUnit passou por horário bloqueado, data passada, sobreposição pela duração, cancelamento, reagendamento, transições inválidas e restrição ao barbeiro responsável. Duas reservas concorrentes retornaram HTTP 200 e 409. |
| Fidelidade | Aprovado | JUnit verificou 9/10 antes da conclusão, ausência de crédito para reserva/cancelamento, emissão única, reserva com valor zero, devolução após cancelamento e bloqueio de uso duplicado. |
| Navegação e CRUD de ponta a ponta | Aprovado | Chromium 390 × 844 (toque emulado) e 1440 × 900. Login, agendamento, cartão fidelidade, uso de recompensa e CRUD de profissionais. Agenda com reagendamento/cancelamento. Nenhuma requisição externa no cenário. |
| Persistência após reiniciar | Aprovado | Processo do JAR desligado e iniciado em nova JVM. H2 em arquivo preservou as respostas completas de agendamentos e fidelidade. |
| Pacote Windows e Java portátil | Integridade verificada | JAR recompilado, arquivos ZIP conferidos e runtime Windows x64 identificado. A execução nativa dos scripts CMD e do Java portátil no Windows ficou pendente. |
| Notebook → celular pela rede Wi-Fi | Pendente de ambiente físico | JAR testado via HTTP com bind geral e porta configurável. A rede da faculdade, o Firewall do Windows e o acesso em smartphone físico precisam de verificação no local. |
| PostgreSQL | Pendente | Driver e configuração JDBC disponíveis. A demonstração e os testes usaram H2. |

Os quatro métodos da suíte JUnit passaram sem falhas. O arquivo scripts/teste-navegador.mjs reproduz a verificação da interface em uma instalação nova no modo demonstração.
