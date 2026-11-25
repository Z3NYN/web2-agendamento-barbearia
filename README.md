# Desenvolvimento Web II — Agendamento de Barbearia

**UEG — Avaliação N2, professor Braully Rocha.**

## Estado desta recuperação

Código-fonte editável da V3, com imagens e logotipo da revisão FINAL (1), atualização automática da agenda/painel a cada cinco segundos, remoção do rodapé repetitivo e ajustes compatíveis de estilo. O backend Java foi preservado. A revisão FINAL (1) não forneceu os TSX originais; portanto, o frontend editável não é uma reprodução integral daquela revisão. A referência exata do frontend compilado está em `referencia-final/frontend-compilado`, fora do build. Use-a para reconstruir a composição visual em React; não substitua o código editável por JavaScript minificado.

Não há banco real, runtime portátil nem credenciais de produção neste pacote. O modo demo usa contas fictícias; não expor esse modo em produção.


Aplicação de agendamento e fidelidade para barbearias, derivada do código de Programação Web II da UEG, professor Braully Rocha. Uma instalação mantém o próprio banco, catálogo, equipe e marca.

## Rodar a demonstração

Use o pacote executável para Windows. Extraia tudo, execute INICIAR_SISTEMA.cmd e abra http://localhost:8080. As contas, os passos para o celular e os procedimentos de backup estão em [LEIA-ME.txt](docs/LEIA-ME.txt).

## Reproduzir o build

- JDK 21 e Node.js 24. O Maven Wrapper usa 3.9.12.
- Windows, scripts\BUILD.cmd. Linux/macOS, ./scripts/build.sh.
- Os scripts compilam React, executam os testes Maven e geram target/app.jar, incluindo os arquivos estáticos. A primeira compilação instala dependências.
- Execute a partir de uma pasta gravável com java -jar target/app.jar. O H2 grava em dados/barbearia.mv.db relativo ao diretório atual.
- Desenvolvimento separado com ./mvnw spring-boot:run e npm --prefix src/main/frontend run dev. O Vite encaminha /api para o backend, com destino configurável em SOLDADO_BACKEND.

## Estrutura

- src/main/java/br/ueg/trindade/braully_web2_fullstack contém o backend e as camadas do Braully.
- src/main/frontend contém React, páginas, componentes, Axios e recursos locais.
- src/test contém os testes da API com JUnit e Spring Boot.
- scripts/teste-navegador.mjs usa Playwright com Chromium sobre uma instalação demo nova. Configure SOLDADO_TEST_URL para apontar ao JAR em execução. Para usar um Chromium já instalado, defina SOLDADO_CHROMIUM.
- docs contém auditoria da base, matriz da N2, roteiro e diagramas.
- scripts contém os arquivos de build e operação local.

O pacote original disponível não contém o bundle de histórico Git citado anteriormente. A publicação deve preservar os commits já existentes no repositório de destino.

## V2

Consulte [melhorias, execução e testes da V2](docs/V2.md).

## V3

Consulte [validação e execução da V3](docs/V3_VALIDACAO.md).
