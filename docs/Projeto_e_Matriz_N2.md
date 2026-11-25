# Studio Soldado do Corte — Programação Web II

## Sistema

O cliente escolhe serviço, profissional e horário, acompanha atendimentos e usa recompensas. A equipe acompanha a agenda. O administrador mantém cadastros, marca, expediente e regras. Cada estabelecimento roda sua própria instalação e usa um banco independente.

## Arquitetura

O navegador usa React, TypeScript, React Router, Axios e Tailwind. As páginas chamam a API relativa a /api. Spring Boot serve a API e o build React na mesma porta. No backend, Controller traduz a requisição, Service aplica a regra de negócio, Repository acessa JPA e Model representa a persistência. O H2 usa arquivo por instalação. PostgreSQL tem driver e parâmetros JDBC, com homologação própria ainda pendente.

## Entidades e relacionamentos

| Entidade | Relação e papel |
| --- | --- |
| Usuario e Permissao | N:N da base. A tabela de junção associa contas a perfis. |
| Barbearia | Um registro por instalação. Guarda marca, dados comerciais, antecedência e regra. Pode apontar para um Servico como benefício. |
| Servico | Entidade de interesse da N1. N:1 com Barbearia. Define preço, duração e elegibilidade. |
| Barbeiro | Adição N2. N:1 com Barbearia e 0..1:0..1 com Usuario quando há conta profissional vinculada. |
| Agendamento | Adição N2. N:1 com Barbeiro, Servico e Usuario (cliente). Preserva o nome, preço, duração e elegibilidade da reserva. |
| Expediente e Bloqueio | Cada registro pertence à Barbearia e pode referenciar um Barbeiro. Sem profissional, vale para a loja. |
| MovimentoFidelidade | N:1 com Usuario. Pode referenciar Agendamento e Servico. O par tipo + agendamento é único. |

O DER editável e o SVG acompanham esta documentação.

## Regras de negócio

- A agenda usa horário de Brasília e permite marcar até 90 dias à frente. Os horários iniciam em intervalos de 15 minutos e o serviço ocupa a duração inteira.
- A faixa precisa caber no expediente da loja e do profissional. Bloqueios e atendimentos ocupam intervalos. Um termina no mesmo instante em que outro pode começar.
- Ao criar ou reagendar, uma transação bloqueia a linha da instalação no banco com PESSIMISTIC_WRITE. O servidor consulta a disponibilidade dentro desse bloqueio. Alterações de expediente, bloqueios e catálogo usam a mesma fila de escrita. O banco serializa as mudanças concorrentes.
- Um cliente cancela ou reagenda dentro da antecedência configurada. A equipe pode confirmar, cancelar, reagendar e concluir conforme perfil. Para concluir, o atendimento precisa estar confirmado e ter alcançado o fim do horário.
- Só uma conclusão elegível gera crédito. Cancelamento e falta não geram crédito. Um atendimento gratuito não gera crédito adicional.
- O saldo é a soma de créditos menos o custo dos benefícios emitidos. Na conclusão elegível, o sistema emite a recompensa quando há saldo e registra o serviço e o custo daquele benefício. Uma mudança de meta vale para as próximas emissões. Benefícios emitidos preservam seus dados.
- Ao reservar com recompensa, a API verifica titularidade, serviço e disponibilidade do benefício. A conclusão registra a utilização. Cancelamento e falta devolvem o benefício disponível. Créditos e recompensas mudam na mesma transação que a agenda.
- Cadastros com histórico preservam os vínculos. Serviços, profissionais e usuários usam desativação. O status Cancelado mantém a reserva no histórico.

## Matriz de requisitos da N2

| Requisito do PDF | Evidência |
| --- | --- |
| Reusar a N1 | Classe principal, estrutura Maven, entidades Usuario/Permissao, relação N:N e módulos React do projeto de aula. Servico supre a entidade de interesse que faltava no ZIP. |
| Duas novas entidades JPA, ID gerado e relacionamento entre novas | Barbeiro e Agendamento usam @Entity, @Id, @GeneratedValue. Agendamento referencia Barbeiro com @ManyToOne. |
| JpaRepository e camadas | BarbeiroRepository e AgendamentoRepository, CatalogoService e AgendaService, BarbeiroController e AgendamentoController. |
| GET, POST, PUT, DELETE, /api e @PathVariable | /api/barbeiros e /api/agendamentos. Os dois possuem consulta individual, criação, edição e desativação ou cancelamento. |
| Regra no Service | Expediente, duração, verificação de conflito, transições, autorização por titularidade e fidelidade. |
| Spring Security, JWT, login e rotas protegidas | SecurityConfig, JwtUtil, JwtFilter, AuthController, LoginPage e RequireAuth. |
| Duas páginas React além do esqueleto | ProfissionaisPage e AgendaPage/AgendarPage. Há também Serviços, Expediente, Fidelidade, Perfil, Marca e Clientes. |
| React Router, menu e CRUD no navegador | App.tsx e Layout.tsx. Em Profissionais: novo, lista, editar e desativar. Em Agenda: nova reserva, lista, reagendamento e cancelamento. |
| Componentes reutilizáveis, formulário controlado, atualização de lista | CadastroCrud, AgendamentoCard, EscolherHorario e useConsulta. |
| Axios com baseURL e @CrossOrigin | services/api.ts com /api. Controllers anotados e origem de desenvolvimento delimitada. |
| Integração React → API → banco | O build do React está no JAR. Consultas e mutações passam pela API e pelo H2. |
| GitHub com commits regulares | Histórico Git local em historico-projeto.bundle, pronto para configurar o remoto. A publicação no GitHub está pendente. |
| Bean Validation | DTOs com @Valid e constraints, erros retornados aos formulários. |
| Upload de arquivos | Marca aceita PNG e JPEG por MultipartFile. A prévia aparece no navegador e a imagem fica no banco. |
| Docker/deploy | Extra opcional fora do escopo deste pacote local. |

## Limites

Uma instalação por barbearia. O acesso do celular depende da comunicação na rede local com o notebook. Para uso real com dados pessoais, inicialize uma instalação limpa, configure HTTPS e valide as rotinas operacionais no ambiente de implantação. O programa inicial de 10 atendimentos é uma configuração fictícia para demonstrar o fluxo.
