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
flowchart TB
    subgraph WEB["Acesso à aplicação"]
        direction LR
        U["Cliente · Barbeiro · Administrador"]
        W["Navegador<br/>React · TypeScript · PWA"]
        P["Serviço externo de Web Push"]

        U --> W
        P -->|Service Worker| W
    end

    subgraph D["Docker Compose"]
        direction LR
        F["Container Frontend<br/>Nginx"]

        subgraph B["Container Backend"]
            direction TB
            S["Java 21 · Spring Boot<br/>REST API · Security · JWT"]
            H[("Banco H2")]
            S <-->|JPA / Hibernate| H
        end

        V[("Volume persistente<br/>barbearia_dados")]

        F <-->|Proxy REST / SSE| S
        H -->|Dados| V
        S -->|Chaves VAPID| V
    end

    W <-->|HTTP / JSON / SSE| F
    S -->|Web Push / VAPID| P
```
