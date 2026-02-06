<div align="center">
  <img src=".github/assets/lockstride-logo.png" alt="Lockstride Logo" width="80" />

# monorepo-nuxt-base

**A production-ready, full-stack monorepo template for modern web applications**

[![CI](https://github.com/lockstride/monorepo-nuxt-base/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/lockstride/monorepo-nuxt-base/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/bmcnaboe/6dd9550366bf28ee6f234ad3a64b8c92/raw/monorepo-nuxt-base-coverage.json)](https://github.com/lockstride/monorepo-nuxt-base)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[![Node.js](https://img.shields.io/badge/node-24-brightgreen.svg)](https://nodejs.org/)
[![Nx](https://img.shields.io/badge/Nx-22.4.5-143055.svg)](https://nx.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11-e0234e.svg)](https://nestjs.com/)
[![Nuxt](https://img.shields.io/badge/Nuxt-4-00dc82.svg)](https://nuxt.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8.svg)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-enabled-2496ED.svg)](https://www.docker.com/)

Built with **Nx**, **NestJS**, **Nuxt 4**, and **Tailwind CSS v4** — featuring comprehensive testing, Docker containerization, and automated CI/CD pipelines.

[Features](#-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [Documentation](#-documentation)

</div>

---

## ✨ Features

- **🏗️ Monorepo Architecture** - Nx-powered workspace with optimal caching and task orchestration
- **🔥 Modern Frontend** - Nuxt 4 with Tailwind CSS v4 for blazing-fast, type-safe development
- **🚀 Robust Backend** - NestJS with Fastify adapter for high-performance APIs
- **🗄️ Database Ready** - PostgreSQL with Prisma ORM, migrations, and seeding
- **📋 API Documentation** - TypeSpec-generated OpenAPI specs with Swagger UI
- **🧪 Comprehensive Testing** - 100% code coverage with Vitest and Cypress E2E tests
- **🐳 Docker Ready** - Multi-stage builds with optimized images for all services
- **⚡ CI/CD Pipeline** - GitHub Actions with automated testing, linting, and deployment
- **🔒 Security First** - Environment variable management, secrets handling, and security best practices
- **📦 Efficient Package Management** - pnpm workspaces with shared dependencies

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **[Node.js](https://nodejs.org/)** v24 (LTS)
- **[pnpm](https://pnpm.io/installation)** v10+
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (for local development)

### 📦 Setup

Get started in minutes:

```bash
# Clone the repository
git clone <your-repo-url>
cd monorepo-nuxt-base

# Install dependencies
pnpm install

# Run development setup (Git hooks + Cypress binary)
pnpm dev-setup

# Build all applications
pnpm build

# Start PostgreSQL database
pnpm db:up

# Run database migrations and seed data
pnpm db:migrate
pnpm db:seed

# Start all applications in development mode
pnpm start
```

### 🌐 Applications

Once running, access your applications at:

| Application   | URL                            | Description                   |
| ------------- | ------------------------------ | ----------------------------- |
| **Webapp**    | http://localhost:3000          | Main web application (Nuxt 4) |
| **API**       | http://localhost:3001/api      | REST API (NestJS + Fastify)   |
| **Marketing** | http://localhost:3002          | Marketing site (Nuxt 4)       |
| **API Docs**  | http://localhost:3001/api/docs | Interactive API documentation |

## 📂 Architecture

This monorepo follows a clean, scalable architecture with clear separation of concerns:

```
monorepo-nuxt-base/
├── apps/
│   ├── api/                 # NestJS REST API (tests in tests/)
│   ├── webapp/              # Main Nuxt 4 application (tests in tests/)
│   └── marketing/           # Marketing site (tests in tests/)
├── packages/
│   ├── data-sources/
│   │   └── prisma/          # Prisma schema, migrations, and client
│   ├── env-run/             # Environment variable management CLI
│   ├── ui/                  # Shared UI components
│   └── utils/               # Shared utilities
├── infra/                   # Docker Compose configurations
├── specs/                   # TypeSpec API definitions
└── docs/                    # Comprehensive documentation
```

### 🛠️ Tech Stack

| Category             | Technologies                              |
| -------------------- | ----------------------------------------- |
| **Monorepo**         | Nx 22 + pnpm Workspaces                   |
| **Backend**          | NestJS 11 with Fastify adapter            |
| **Frontend**         | Nuxt 4 + Vue.js 3 + Tailwind CSS v4       |
| **Database**         | PostgreSQL 18 + Prisma ORM                |
| **API Spec**         | TypeSpec with Swagger UI                  |
| **Testing**          | Vitest (unit/integration) + Cypress (E2E) |
| **Containerization** | Docker with optimized multi-stage builds  |
| **CI/CD**            | GitHub Actions                            |
| **Code Quality**     | ESLint, Prettier, Husky, lint-staged      |

## 💻 Common Commands

### Development

```bash
pnpm start                  # Start all applications in watch mode
pnpm build                  # Build all applications for production
pnpm dev-setup              # Initial setup: Git hooks + Cypress binary
```

### Testing

```bash
pnpm test-unit              # Run all unit tests
pnpm test-coverage          # Run tests with 100% coverage enforcement
pnpm test-e2e               # Run end-to-end tests with Cypress
```

### Code Quality

```bash
pnpm lint:check             # Check for linting issues
pnpm lint:fix               # Auto-fix linting issues
pnpm format:write           # Format all files with Prettier
pnpm format:check           # Check code formatting
pnpm all-check              # Run all CI checks (lint, format, type-check, test)
```

### Database Management

```bash
pnpm db:up                  # Start PostgreSQL container
pnpm db:down                # Stop PostgreSQL container
pnpm db:migrate             # Run pending migrations
pnpm db:reset               # Reset database to initial state
pnpm db:seed                # Seed database with sample data
pnpm db:studio              # Open Prisma Studio (database GUI)
```

### Docker Operations

```bash
pnpm docker:up              # Start all services in Docker
pnpm docker:down            # Stop and remove Docker containers
```

## 📚 Documentation

Comprehensive guides to help you make the most of this template:

| Guide                                        | Description                                           |
| -------------------------------------------- | ----------------------------------------------------- |
| [Development Guide](docs/development.md)     | IDE setup, environment configuration, troubleshooting |
| [Testing Guide](docs/testing.md)             | Testing philosophy, coverage strategy, writing tests  |
| [Deployment Guide](docs/deployment.md)       | Docker deployment, migrations, monitoring             |
| [env-run README](packages/env-run/README.md) | Environment variable management                       |

## 🤝 Feedback & Contributions

This template is maintained with limited bandwidth. Bug reports and suggestions are welcome via issues, though response times may vary. For feature additions, consider forking the template for your specific needs.

The project follows:

- **100% test coverage** - All code must be tested
- **Type safety** - TypeScript throughout the stack
- **Code quality** - ESLint and Prettier enforce consistent style

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🏢 About

Built by [**Lockstride**](https://lockstride.ai) - Accelerating software development with AI-powered tools, templates, and workflows.

📧 **Contact:** hello+monorepo@lockstride.ai

---

<div align="center">

⭐ **If you find this template helpful, consider giving it a star!** ⭐

</div>
