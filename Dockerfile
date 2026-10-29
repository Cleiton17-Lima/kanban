# Etapa 1: compilar a aplicação com Java 25 e Maven
FROM maven:3.9-eclipse-temurin-25 AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN mvn -B -DskipTests package

# Etapa 2: executar a aplicação com Java 25
FROM eclipse-temurin:25-jre

WORKDIR /app

COPY --from=build /app/target/kanban-0.0.1-SNAPSHOT.jar app.jar

ENV SERVER_PORT=10000

EXPOSE 10000

ENTRYPOINT ["java", "-jar", "app.jar"]
