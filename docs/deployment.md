# Deployment Guide

Comprehensive guide for deploying applications to production using Docker containers, managing database migrations, and implementing monitoring and security best practices.

## Overview

This monorepo is designed for containerized deployment using Docker. Each application has an optimized multi-stage Dockerfile that produces minimal production images.

## Prerequisites

Before deploying to production, ensure you have:

- **Docker and Docker Compose** — Version 24.0+ recommended
- **Container registry access** — Docker Hub, AWS ECR, Google Container Registry, etc.
- **PostgreSQL database** — Version 18 or compatible version
- **Domain name and DNS** — Properly configured for your applications
- **SSL/TLS certificates** — Let's Encrypt recommended for free certificates
- **Secrets management** — Infisical or similar platform (see [env-run README](../packages/env-run/README.md))

## Environment Configuration

Environment variables are managed using the `env-run` package, which supports both local `.env` files and integration with Infisical for centralized secrets management.

### Production Environment Setup

1. **Configure Infisical** for production secrets (recommended approach)
2. **Set required environment variables** in your secrets management platform
3. **Configure service-specific variables** for each application

### Required Environment Variables

Each application requires specific environment variables:

#### API (`apps/api`)

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:password@host:5432/database
LOG_LEVEL=info
```

#### Webapp and Marketing (`apps/webapp`, `apps/marketing`)

```bash
NODE_ENV=production
PORT=3000  # or 3002 for marketing
NUXT_API_URL=https://api.yourdomain.com
```

For detailed documentation on environment variable sourcing, precedence rules, and Infisical integration, see the [env-run README](../packages/env-run/README.md).

## Docker Deployment

### Building Container Images

Each application has an optimized multi-stage Dockerfile for production deployments.

#### Build All Images

```bash
docker compose -f infra/compose.local.yml build
```

#### Build Individual Applications

```bash
# API
docker build -f apps/api/Dockerfile -t your-registry/monorepo-api:latest .

# Webapp
docker build -f apps/webapp/Dockerfile -t your-registry/monorepo-webapp:latest .

# Marketing
docker build -f apps/marketing/Dockerfile -t your-registry/monorepo-marketing:latest .
```

#### Tag and Push to Registry

```bash
# Tag images
docker tag your-registry/monorepo-api:latest your-registry/monorepo-api:v1.0.0

# Push to registry
docker push your-registry/monorepo-api:latest
docker push your-registry/monorepo-api:v1.0.0
```

### Multi-Stage Build Benefits

All Dockerfiles use multi-stage builds for:

- **Smaller image sizes** — Only production dependencies included
- **Better security** — Build tools and dev dependencies not in final image
- **Faster deployments** — Smaller images transfer and start faster
- **Layer caching** — Optimized layer order for faster rebuilds

### Deployment to Production

Deploy using your preferred orchestration platform:

#### Docker Compose (Simple Deployments)

```bash
# Create production compose file (not included in repo)
# docker-compose.prod.yml

docker compose -f docker-compose.prod.yml up -d
```

#### Kubernetes (Recommended for Scale)

```yaml
# Example Kubernetes deployment (create your own manifests)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: your-registry/monorepo-api:v1.0.0
          ports:
            - containerPort: 3001
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
```

#### Cloud Platforms

- **AWS ECS/Fargate** — Use task definitions with container images
- **Google Cloud Run** — Deploy containerized apps with auto-scaling
- **Azure Container Apps** — Serverless container hosting
- **Fly.io** — Simple deployment with `fly.toml` configuration

## Database Migrations

### Production Migration Strategy

Always run migrations before deploying new application code to ensure database schema is ready.

#### Running Migrations

```bash
# Set production database URL
DATABASE_URL="postgresql://user:password@host:5432/database"

# Run pending migrations
pnpm prisma migrate deploy

# Verify migration status
pnpm prisma migrate status
```

#### CI/CD Integration

In your deployment pipeline:

```bash
# 1. Run migrations first
DATABASE_URL=$PRODUCTION_DB_URL pnpm prisma migrate deploy

# 2. Deploy new application containers
# (your deployment command)

# 3. Verify health checks pass
```

### Migration Best Practices

1. **Test migrations thoroughly** in staging before production
2. **Make migrations backward compatible** when possible
3. **Plan for rollback** — ensure old code can run on new schema temporarily
4. **Avoid data-heavy migrations** in production — use batch processes instead
5. **Monitor migration execution** — long-running migrations may require downtime windows

### Creating Production Migrations

During development:

```bash
# Create migration with descriptive name
nx run prisma:db:migrate-dev --args="--name=add_user_roles"

# Review generated SQL in prisma/migrations/
# Test thoroughly before committing
```

### Backup and Restore

#### Create Database Backup

```bash
# Using pg_dump
pg_dump -h your-db-host -U your-user -d your-database -F c -f backup-$(date +%Y%m%d-%H%M%S).dump

# Or using Docker
docker exec -t postgres-container pg_dump -U postgres database > backup.sql
```

#### Restore from Backup

```bash
# Using pg_restore
pg_restore -h your-db-host -U your-user -d your-database backup.dump

# Or using Docker
docker exec -i postgres-container psql -U postgres database < backup.sql
```

### Backup Strategy

Implement automated backups:

- **Daily backups** — Full database dump retained for 30 days
- **Point-in-time recovery** — Enable WAL archiving for PostgreSQL
- **Test restores regularly** — Verify backups are valid and complete
- **Offsite storage** — Store backups in different region/provider

## Monitoring and Observability

### Health Checks

Each application exposes health check endpoints for monitoring and orchestration:

#### API Health Endpoints

- **`GET /api/health`** — Overall application health
- **`GET /api/health/ready`** — Readiness probe (database connectivity, dependencies)
- **`GET /api/health/live`** — Liveness probe (application is running)

#### Frontend Applications

- **Static asset availability** — Monitor successful loading of main bundles
- **Client-side error tracking** — Use error boundary and reporting

### Application Logging

Configure structured logging for production:

```typescript
// apps/api/src/main.ts
import { Logger } from "@nestjs/common";

const logger = new Logger("Bootstrap");

// Log level based on environment
const logLevel = process.env.LOG_LEVEL || "info";

logger.log(`Application starting on port ${port}`);
logger.log(`Environment: ${process.env.NODE_ENV}`);
logger.log(`Database: ${databaseHost}`);
```

### Log Management

- **Structured logs** — Use JSON format for easier parsing
- **Correlation IDs** — Track requests across services
- **Log levels** — Use appropriate levels (error, warn, info, debug)
- **Sensitive data** — Never log passwords, tokens, or PII
- **Centralized logging** — Aggregate logs with ELK, CloudWatch, or Datadog

### Metrics and Monitoring

Consider implementing:

#### Application Performance Monitoring (APM)

- **Datadog** — Full-stack observability platform
- **New Relic** — Application performance insights
- **Elastic APM** — Open-source APM solution

#### Error Tracking

- **Sentry** — Real-time error tracking and reporting
- **Rollbar** — Error monitoring and debugging
- **Bugsnag** — Stability monitoring platform

#### Infrastructure Monitoring

- **Uptime monitoring** — Pingdom, UptimeRobot, StatusCake
- **Database monitoring** — PostgreSQL metrics, slow query logs
- **Container metrics** — CPU, memory, network usage
- **Response times** — API endpoint latency tracking

### Alerting Strategy

Set up alerts for critical issues:

- **Error rate spikes** — Alert when error rate exceeds threshold
- **Response time degradation** — Alert on slow response times
- **Health check failures** — Immediate notification for service down
- **Database issues** — Connection pool exhaustion, slow queries
- **Resource exhaustion** — High CPU, memory, disk usage

## Security Best Practices

### SSL/TLS Configuration

- **Use Let's Encrypt** for free, automated SSL certificates
- **Configure automatic renewal** to prevent certificate expiration
- **Enable HTTP/2** for improved performance
- **Redirect HTTP to HTTPS** for all traffic
- **Use strong TLS versions** — TLS 1.2 minimum, TLS 1.3 preferred
- **Configure secure cipher suites** — Disable weak ciphers

### Environment Variables and Secrets

- **Never commit secrets** to version control
- **Use secrets management** — Infisical, AWS Secrets Manager, Vault
- **Rotate credentials regularly** — Especially after team member departures
- **Principle of least privilege** — Grant minimum necessary permissions
- **Separate environments** — Different credentials for dev, staging, production

### Network Security

- **Configure firewalls** to restrict access to necessary ports only
- **Use private networks** — VPC for cloud deployments
- **Implement rate limiting** to prevent abuse
- **Enable CORS properly** — Restrict origins in production
- **Use security headers** — HSTS, CSP, X-Frame-Options, etc.

### Application Security

- **Validate all inputs** — Never trust client data
- **Use parameterized queries** — Prisma protects against SQL injection
- **Sanitize output** — Prevent XSS attacks
- **Implement authentication** — JWT, OAuth, or session-based
- **Enforce authorization** — Check permissions before operations
- **Keep dependencies updated** — Regular security patches

### Container Security

- **Use official base images** — Node.js official images
- **Run as non-root user** — Avoid running containers as root
- **Scan images for vulnerabilities** — Use Docker Scout or Trivy
- **Minimize image size** — Fewer packages = smaller attack surface
- **Use multi-stage builds** — Keep build tools out of production images

## CI/CD Pipeline

This repository includes GitHub Actions workflows for automated testing and deployment.

### Continuous Integration (`.github/workflows/ci.yml`)

The CI workflow runs on every pull request and push to `main`:

1. **Code Quality**
   - Format check with Prettier
   - Lint with ESLint
   - TypeSpec validation

2. **Build Verification**
   - Build all applications and packages
   - Verify TypeScript compilation

3. **Testing**
   - Run unit tests with 100% coverage enforcement
   - Run E2E tests for all applications
   - Aggregate and upload coverage reports

### Continuous Deployment (`.github/workflows/deploy.yml`)

Customize the deployment workflow for your infrastructure:

```yaml
# Example deployment workflow
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run migrations
        run: |
          DATABASE_URL=${{ secrets.DATABASE_URL }} pnpm prisma migrate deploy

      - name: Build and push Docker images
        run: |
          docker build -f apps/api/Dockerfile -t registry/api:${{ github.sha }} .
          docker push registry/api:${{ github.sha }}

      - name: Deploy to production
        # Your deployment step here
```

### Deployment Strategies

#### Blue-Green Deployment

1. Deploy new version alongside old version
2. Test new version thoroughly
3. Switch traffic to new version
4. Keep old version for quick rollback

#### Rolling Deployment

1. Update instances incrementally
2. Monitor health checks after each update
3. Pause or rollback if issues detected

#### Canary Deployment

1. Deploy to small percentage of traffic
2. Monitor metrics and errors
3. Gradually increase traffic if healthy
4. Full rollout or rollback based on results

## Troubleshooting

### Common Deployment Issues

#### Database Connection Failures

**Symptoms**: Application can't connect to production database

**Solutions**:

1. Verify network connectivity between app and database
2. Check credentials and connection string format
3. Ensure database is running and accepting connections
4. Verify firewall rules allow traffic on PostgreSQL port (5432)
5. Check if database is at capacity (connection limits)
6. Review security group/network policies

#### Container Startup Issues

**Symptoms**: Containers fail to start or crash immediately

**Solutions**:

1. Check container logs: `docker logs <container-name>`
2. Verify all required environment variables are set
3. Check resource limits (CPU, memory) are adequate
4. Ensure health check configuration is appropriate
5. Verify image was built successfully and pushed to registry
6. Check for port conflicts with other services

#### Migration Failures

**Symptoms**: Database migrations fail during deployment

**Solutions**:

1. Test migrations in staging environment first
2. Check database permissions for migration user
3. Verify no manual schema changes conflict with migrations
4. Review migration SQL for syntax errors
5. Ensure database has sufficient disk space
6. Check for blocking locks on tables

#### Performance Issues

**Symptoms**: Slow response times or high resource usage

**Solutions**:

1. Monitor resource usage (CPU, memory, network)
2. Check database query performance with slow query logs
3. Review application logs for errors or warnings
4. Analyze APM data for bottlenecks
5. Check if database connection pool is properly configured
6. Verify CDN and caching are working correctly
7. Consider horizontal scaling if consistently high load

#### SSL/TLS Certificate Issues

**Symptoms**: HTTPS not working or certificate errors

**Solutions**:

1. Verify certificate is not expired
2. Check certificate includes all necessary domains
3. Ensure certificate renewal automation is working
4. Verify intermediate certificates are installed
5. Test with SSL Labs for configuration issues

### Rollback Procedures

When deployment issues occur, follow these rollback steps:

#### Application Rollback

1. **Identify last known good version**

   ```bash
   # List recent image tags
   docker images your-registry/api --format "{{.Tag}}"
   ```

2. **Deploy previous version**

   ```bash
   # Update deployment to use previous image tag
   docker pull your-registry/api:previous-tag
   docker-compose up -d api
   ```

3. **Verify health checks pass**
   ```bash
   curl https://api.yourdomain.com/health
   ```

#### Database Rollback

For schema changes requiring rollback:

1. **Prepare rollback migrations in advance** (create during development)
2. **Test rollback procedure in staging**
3. **Execute rollback migration**
   ```bash
   # Apply down migration (if available)
   # Manual SQL may be required for complex changes
   ```

### Disaster Recovery

In case of major incidents:

1. **Activate incident response plan**
2. **Restore from most recent backup**
   ```bash
   pg_restore -h your-db-host -U your-user -d your-database latest-backup.dump
   ```
3. **Deploy last stable version of applications**
4. **Verify all health checks pass**
5. **Conduct post-mortem to prevent recurrence**

### Getting Help

If issues persist:

1. **Check application logs** for detailed error messages
2. **Review monitoring dashboards** for patterns
3. **Consult runbooks** for known issues and solutions
4. **Escalate to on-call engineer** if critical
5. **Document issue and solution** for future reference
