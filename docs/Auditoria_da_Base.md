# Auditoria da base de aula

## Fontes verificadas

Foram recuperados e consultados os dois PDFs da Avaliação N2, a ementa, as aulas 01, 02, 03, 04, 05, 06, a Avaliação N1 (Aula 06.5), as aulas 07, 08, 08.5, 10, o logotipo original JPEG e o ZIP da aula. Os dois PDFs da N2 trazem os mesmos requisitos técnicos e prazo final em 04/12/2026. O PDF (2) explicita a janela de apresentação de 20/11 a 04/12. O PDF (3) indica apresentação até 04/12.

O ZIP original foi preservado byte a byte. SHA-256  
885806b70b09a9ec2d36e400e7e0d356811377df486e35b20008fb15131d6ed9

O teste de integridade relatou dois offsets de cabeçalhos locais inválidos, nas entradas iniciais da pasta raiz (offset 0) e de .gitattributes (offset 53). Os arquivos Java, React, Maven e demais entradas que passaram na verificação foram extraídos. Foi criado um novo .gitattributes na derivação. O ZIP original não faz parte do pacote distribuível porque contém o banco e o log do professor. Os arquivos originais permanecem disponíveis na referência enviada pelo usuário.

## Diagnóstico e mudanças

| Item | Observação na base | Decisão aplicada |
| --- | --- | --- |
| Versões | Java 25 no pom, Java 21 na Avaliação N1. Spring Boot 4.1.1, JJWT 0.12.6. React 19.2.8, React Router 7.18.4, Axios 1.20.0, Tailwind 4.3.3, TypeScript ~6.0.2 e Vite ^8.2.0 no manifesto. O lockfile resolve TypeScript 6.0.3 e Vite 8.2.2. | JDK/JRE 21 alinhado à N1. Mantidas as versões do Spring Boot, JJWT e das dependências principais. Maven Wrapper foi de 3.9.16 para 3.9.12, alinhado ao Maven de verificação. |
| Camadas | Controllers Auth, Usuário e Permissão, Services correspondentes, dois repositórios JPA e modelos Usuario/Permissao. | Mantidos pacotes, classe principal e relacionamento ManyToMany. A aplicação estende a base com camadas de catálogo, agenda, expediente, marca e fidelidade. |
| Entidade de interesse | O pacote contém Usuario e Permissao. Não há Produto nem outra entidade de interesse. | Servico preenche a lacuna acadêmica. Barbeiro e Agendamento são as duas adições mapeadas para a N2. |
| H2 | jdbc:h2:file:./database.db, ddl-auto=update, arquivos de banco e trace dentro do ZIP. | H2 em dados/barbearia.mv.db, carga inicial transacional em banco novo e sem importação dos dados da aula. Console e publicação automática por Spring Data REST removidos da distribuição. |
| CRUD de permissões | API tinha GET da coleção e POST. A tela de detalhe chamava GET por ID inexistente. A listagem não oferecia formulários de criação, edição ou remoção. | API completa com proteção administrativa, telas de edição, detalhe e proteção dos perfis internos. |
| Usuários | Criar gravava diretamente a entidade, cujo campo senha estava oculto para desserialização. O formulário não enviava senha e o serviço não a codificava. | Formulário com senha, DTOs validados, BCrypt, desativação preservando vínculos e atribuição de permissões protegida. |
| JWT | Login emitia JWT válido, permissões vinham das claims, chave fixa no properties e as contas didáticas eram inicializadas automaticamente. Logout removia dados locais. | JWT continua assinado com JJWT e BCrypt, com chave externa ou aleatória por processo. Cada requisição carrega o usuário e os perfis atuais. Logout invalida as sessões do usuário no servidor. Contas fixas existem exclusivamente no modo demo. |
| Navegação | BrowserRouter, LoginPage, Layout, Usuários, Permissões, Detalhes e Atribuição. Axios tinha URL absoluta localhost:8080. | Telas correspondentes e fundamentos preservados com evolução visual, rotas por perfil, baseURL relativa /api, @CrossOrigin para dev e frontend compilado no JAR. |
| Recursos do projeto | A base inclui ativos do template Vite e scripts auxiliares de modernização. | Removidos recursos iniciais sem uso. Fontes de interface e imagem de demonstração estão no pacote local. |
