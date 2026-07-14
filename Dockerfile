# ==========================================
# Stage 1: Build the React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependencies first for layer caching
COPY frontend/package*.json ./
RUN npm ci

# Copy configurations and source
COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY frontend/public ./public
COPY frontend/src ./src

# Build the frontend to /app/frontend/dist
RUN npm run build

# ==========================================
# Stage 2: Build the Spring Boot Backend
# ==========================================
FROM maven:3.8.5-openjdk-17 AS backend-builder
WORKDIR /app/backend

# Copy pom.xml and fetch dependencies to cache maven repository layer
COPY backend/pom.xml ./
RUN mvn dependency:go-offline -B

# Copy backend source code
COPY backend/src ./src

# Copy built frontend assets to Spring Boot static resources
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static/

# Package the Spring Boot application (skipping unit tests for deployment package speed)
RUN mvn clean package -DskipTests -B

# ==========================================
# Stage 3: Run the Application
# ==========================================
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy packaged JAR from stage 2
COPY --from=backend-builder /app/backend/target/simulator-0.0.1-SNAPSHOT.jar ./app.jar

# Expose port (dynamic port mapping will be handled by Render via PORT env var)
EXPOSE 8080

# Environment variables setup
ENV SPRING_PROFILES_ACTIVE=prod

# Run the jar with JVM memory options optimized for free-tier constraints (512MB RAM)
ENTRYPOINT exec java -XX:MaxRAMPercentage=70.0 -XX:ActiveProcessorCount=1 -Dserver.port=${PORT:-8080} -Djava.security.egd=file:/dev/./urandom -jar app.jar
