# Studio Soldado do Corte — Sistema Web de Agendamento

Projeto da disciplina **Desenvolvimento Web II** da **Universidade Estadual de Goiás (UEG)**, ministrada pelo professor **Braully Rocha da Silva**. Evolução da base da N1 para um sistema comercial completo de agendamento, gestão administrativa e programa de fidelidade para barbearias.

## Tecnologias

- **Backend:** Java 21, Spring Boot, Spring Security, JWT, Spring Data JPA, Bean Validation e H2 persistente.
- **Frontend:** React, TypeScript, React Router, Axios, Tailwind CSS e Vite.
- **Containerização:** Docker multi-stage (Maven/Temurin 21 + Node 22/Nginx unprivileged) e Docker Compose.

## Execução com Docker

```bash
docker compose up --build -d --wait
```

Após a inicialização dos containers, acesse: **http://localhost:8080**

O banco H2 e as chaves VAPID ficam persistidos no volume Docker `barbearia_dados`, preservando os registros entre reinicializações e recriações.

Para encerrar mantendo os dados persistidos:

```bash
docker compose down
```

### Modo produção (sem contas de demonstração)

1. Copie `.env.example` para `.env`.
2. Configure `SOLDADO_DEMO=false`, `SOLDADO_ADMIN_PASSWORD` e `SOLDADO_JWT_SECRET` (mínimo de 32 bytes).
3. Inicie com a sobreposição de produção:

```bash
docker compose -f compose.yaml -f compose.prod.yaml up --build -d --wait
```

## Execução local (sem Docker)

Com Java 21 e Node.js instalados:

```powershell
.\scripts\BUILD.cmd
.\scripts\INICIAR_SISTEMA.cmd
```

Acesse **http://localhost:8080** (ou pelo IP local da máquina no celular).

## Testes automatizados

```powershell
.\mvnw.cmd test
```
## Arquitetura do Sistema

```mermaid
flowchart LR
    A["Cliente · Barbeiro · Admin<br/>React · TypeScript · PWA"]
    B["Frontend<br/>Nginx · Vite"]
    C["Backend<br/>Java 21 · Spring Boot<br/>Security · JWT · JPA · H2"]
    D[("Volume Docker<br/>Dados · Chaves VAPID")]
    E["Serviço Web Push"]

    A <-->|HTTP| B
    B <-->|REST / SSE| C
    C -->|Persistência| D
    C -->|VAPID| E
    E -->|Service Worker| A
```
