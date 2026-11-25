# Studio Soldado do Corte V3

Versão 3.0.0. A aplicação mantém a base do projeto de Programação Web II e o banco H2 local. O executável Windows inclui o frontend, o JAR, Java 21 x64, instruções e os scripts de operação.

## V2 e V3

| Área | V2 | V3 |
|---|---|---|
| Abertura e home | Capa e catálogo em sequência | Abertura opcional, busca, carrosséis, próximos horários pela API e indicador do próximo atendimento |
| Catálogo | Serviços e equipe na home | Páginas de serviços e profissionais, cartões com foto, perfil com disponibilidade |
| Reserva | Login antes da seleção | Exploração pública, retorno à revisão após login, datas por semana e mês, horários por período |
| Profissional | Escolha individual | Escolha individual ou atribuição de um profissional livre dentro da transação |
| Fidelidade | Cartão de progresso | Cartão de membro com marca original, barra champagne, selos, recompensa e histórico |
| Galeria | Upload e exposição na home | Páginas com categorias, navegação por toque e teclado e fotos ilustrativas identificadas |
| Administração | Agenda, filtros básicos e cadastros | Visão geral com dados do dia e da semana, filtro de status, busca em cadastros e prévia da marca |
| Distribuição | Executável e atualização leve | Um pacote completo da V3 com o próprio JAR |

A composição da ilustração aprovada foi traduzida em abertura fotográfica, barra inferior no celular, cartões de serviço com foto lateral no catálogo, calendário com dias arredondados, cartão de fidelidade e barra lateral no painel. A revisão visual comparou as capturas do navegador com as três imagens de referência. O logotipo original foi servido proporcionalmente e permaneceu sem alterações no desenho. As fotos de demonstração são ilustrativas, estão no pacote em WebP e cedem lugar a imagens cadastradas. Preços e profissionais de demonstração estão identificados. Novos cadastros de demonstração usam grafite e champagne. Bancos existentes mantêm suas cores já salvas.

## Requisitos da N2 e preservação

- A base original do professor Braully, os PDFs das aulas e as duas versões da avaliação foram usados para manter os requisitos já mapeados em Projeto_e_Matriz_N2.md. A arquitetura continua com Controller, Service, Repository e Model.
- React, TypeScript, Tailwind, Axios e React Router no frontend. Java, Spring Boot, JPA, Security/JWT, Maven e H2 no backend. CRUDs e rotas administrativas preservados. A interface pública pode consultar disponibilidade sem sessão. A criação da reserva continua autenticada.
- O backend recalcula a disponibilidade com expediente, bloqueios, duração e conflitos, inclusive no modo qualquer profissional. A reserva e o reagendamento evitam sobreposição para o mesmo cliente. A fidelidade continua calculada apenas pelo backend.
- A V3 adiciona categoria às fotos e amplia os tipos de mídia. O teste de migração iniciou com um banco V2 e uma foto publicada, carregou a V3 e confirmou que os registros antigos e novos permanecem após reiniciar.

## Verificação

| Teste | Resultado |
|---|---|
| TypeScript e Vite | Build de produção concluído. |
| Maven e JUnit | 4 testes de integração Spring aprovados, sem erros ou falhas. Inclui autenticação, autorização, CRUD, agenda e fidelidade. |
| API V3 e regressão V2 | Consultas públicas, atribuição automática, duas reservas simultâneas, proteção por perfil, upload, substituição, remoção, reagendamento, cancelamento e resgate verificados. |
| Playwright, Chromium | 15 capturas da aplicação real. Fluxo por toque, carrossel por teclado, busca, calendário, retorno após login, confirmação, reagendamento, cancelamento, recompensa, galeria, CRUD, upload e personalização. |
| Responsividade | Sem rolagem horizontal acidental nas rotas testadas em 320, 360, 390, 430, 768, 1024 e 1440 px. |
| Rede e movimento | Nenhuma requisição externa, erro de JavaScript ou resposta HTTP inesperada nos fluxos testados. O teste também verificou o modo de movimento reduzido. |
| Dados | Migração de banco V2 com foto existente, persistência de mídia nova, dados da marca e banco H2 após reinício. |
| Integração nativa | O JAR foi executado em Linux com Java 21. O inicializador Windows, a execução em aparelho físico, e o Wi-Fi real do usuário ainda precisam de validação no dispositivo. |

Em um JDK Java 21 completo, use npm ci e npm run build dentro de src/main/frontend, depois ./mvnw verify na raiz. O ambiente de validação usou um runtime 21 sem ct.sym. Nesse ambiente, a compilação Maven foi feita com maven.compiler.release vazio e source/target 21. Isso não é requisito para o uso do pacote. O teste de navegador usa scripts/teste-v3-navegador.mjs, com uma base de demonstração descartável. Os testes da API usam scripts/teste-v3-api.py e scripts/teste-v2-api.py. Os roteiros modificam dados de demonstração. A gravação com Chromium foi exportada para MP4 sem áudio.

Os módulos de ambiente, serviços, perfis e galeria possuem imagens demonstrativas locais. O arquivo ICS é opcional e não foi incluído. A previsão de horários encontra até quatro dias com vaga nas próximas duas semanas. A agenda permite marcar até 90 dias.

## Como testar no PC e no celular

1. Extraia o ZIP inteiro para uma pasta nova no Windows x64. Abra INICIAR_SISTEMA.cmd e aguarde Started. Use http://localhost:8080.
2. Para levar dados existentes, feche a V2, execute BACKUP_DADOS.cmd na instalação antiga e copie a pasta dados para a pasta nova, antes do primeiro início. Mantenha o backup original.
3. Para abrir no celular, mantenha o Windows e o celular na mesma rede, veja o IPv4 Wi-Fi com ipconfig e acesse http://IP-DO-PC:8080. Se necessário, permita o Java portátil no firewall somente para a rede privada.
4. Explore serviço, profissional, data e horário sem autenticar. Na revisão, entre com cliente / ClienteDemo@2026. Confira a seleção restaurada e confirme.
5. Entre com admin / AdminDemo@2026 para abrir o painel. Conclua o atendimento de demonstração já encerrado na agenda. Na conta cliente, confira a recompensa liberada.
6. Na personalização, altere o nome ou uma cor, veja a prévia, salve e revise a home. Capa, abertura e galeria estão no mesmo menu. Fotos de profissionais e serviços são editadas no próprio cadastro.
