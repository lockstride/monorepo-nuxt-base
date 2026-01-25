# Deployment Guide

## Overview

This guide covers deploying the application to various environments using Docker and CI/CD pipelines.

## Prerequisites

- Docker and Docker Compose
- Access to a container registry (Docker Hub, AWS ECR, etc.)
- Database instance (PostgreSQL)
- Domain name and SSL certificates

## Environment Configuration

Environment variables are managed using the `env-run` package, which supports `.env` files and integration with Infisical for secrets management. Before deploying, ensure that all required environment variables for the production environment are configured in your secrets management platform.

For detailed documentation on environment variable sourcing, precedence rules, and usage, see the [env-run README](../packages/env-run/README.md).

## Docker Deployment

### Building Images

```bash
# Build all images
docker compose -f infra/compose.local.yml build

# Build specific service
docker build -f apps/api/Dockerfile -t your-registry/api:latest .
docker build -f apps/webapp/Dockerfile -t your-registry/webapp:latest .
docker build -f apps/marketing/Dockerfile -t your-registry/marketing:latest .
```

## Database Migration

### Production Migration

```bash
# Run migrations
DATABASE_URL="your-production-db-url" pnpm prisma migrate deploy

# Verify migration status
DATABASE_URL="your-production-db-url" pnpm prisma migrate status
```

### Backup Strategy

```bash
# Create backup
pg_dump -h your-db-host -U your-user -d your-database > backup.sql

# Restore backup
psql -h your-db-host -U your-user -d your-database < backup.sql
```

## Monitoring and Logging

### Health Checks

- **API**: GET /api/health
- **Database**: Connection pool health
- **Frontend**: Static asset availability

### Logging

Configure logging for production:

```typescript
// apps/api/src/main.ts
import { Logger } from "@nestjs/common";

const logger = new Logger("Bootstrap");
logger.log(`Application is running on: http://localhost:${port}/api`);
```

### Monitoring

Consider implementing:

- Application Performance Monitoring (APM)
- Error tracking (Sentry)
- Uptime monitoring
- Database performance monitoring

## Security

### SSL/TLS

- Use Let's Encrypt for free SSL certificates
- Configure automatic certificate renewal
- Enable HTTP/2 for better performance

### Environment Variables

- Never commit sensitive data to version control
- Use secrets management services
- Rotate credentials regularly

### Network Security

- Configure firewalls to restrict access
- Use VPC for cloud deployments
- Implement rate limiting

## Troubleshooting

### Common Issues

1. **Database connection failures:**
   - Check network connectivity
   - Verify credentials and connection string
   - Ensure database is running

2. **Container startup issues:**
   - Check container logs: `docker logs <container-name>`
   - Verify environment variables
   - Check resource limits

3. **Performance issues:**
   - Monitor resource usage
   - Check database query performance
   - Review application logs

### Rollback Strategy

1. **Keep previous image versions**
2. **Database migration rollback scripts**
3. **Blue-green deployment strategy**
4. **Feature flags for gradual rollouts**
