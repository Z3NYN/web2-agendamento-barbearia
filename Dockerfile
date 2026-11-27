# syntax=docker/dockerfile:1.7

FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /workspace

COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src/main/java src/main/java
COPY src/main/resources src/main/resources
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app \
    && mkdir -p /app/dados \
    && chown -R app:app /app

COPY --from=build --chown=app:app /workspace/target/app.jar /app/app.jar

ENV SOLDADO_BIND=0.0.0.0 \
    SOLDADO_PORT=8080 \
    SOLDADO_DB_URL=jdbc:h2:file:/app/dados/barbearia;LOCK_TIMEOUT=15000 \
    SOLDADO_VAPID_FILE=/app/dados/vapid.properties

USER app
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=5 \
  CMD wget -qO- "http://127.0.0.1:${SOLDADO_PORT:-8080}/api/publico/barbearia" >/dev/null || exit 1

ENTRYPOINT ["java", "-Djava.awt.headless=true", "-Dfile.encoding=UTF-8", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
