# `env-run`

`env-run` is a command-line utility for managing and injecting environment variables into node processes. It supports loading variables from local `.env` files and integrating with [Infisical](https://infisical.com/) for centralized secret management.

## Features

- Load environment variables from `.env` and `.env.<environment>` files.
- Fetch secrets from Infisical and cache them locally in `.env.<environment>` files.
- Override/add environment variables via command-line arguments with highest precedence.
- Clear precedence rules for environment variable sources.
- Force-refresh secrets from Infisical.
- Debug mode to inspect the source of each environment variable.

## Environment Variable Sourcing Logic

`env-run` follows a specific order of precedence to determine which environment variables to load. The logic is primarily driven by the `--env` flag.

1.  **Environment-Specific `.env` File (`.env.<environment>`):**
    - If a file corresponding to the `--env` flag exists (e.g., `.env.dev-docker` for `--env=dev-docker`), `env-run` will **only** load variables from this file.
    - It will not attempt to contact Infisical.
    - It will not load environments from a `.env` or any other such file.
    - These variables override any existing process environment variables.

2.  **Infisical Integration:**
    - If an environment-specific `.env` file is **not** found, `env-run` checks for Infisical credentials (`INFISICAL_MACHINE_IDENTITY_CLIENT_ID` and `INFISICAL_MACHINE_IDENTITY_CLIENT_SECRET`) in the environment.
    - Infisical credentials can come from the root OS process (true native environment variables), of if not present there, from a `.env` file in the monorepo root directory.
    - NOTE: When loading Infisical credentials from a `.env` file, care should be taken not to load ALL environment variables from this file into the process, just the Infisical credentials should be loaded at this stage.
    - If valid credentials exist, it attempts to authenticate with Infisical.
    - **On successful login:**
      - It fetches all secrets for the specified environment from your Infisical project (defined by `INFISICAL_PROJECT_ID`). This includes imported secrets.
      - These secrets from Infisical take precedence over any variables defined in a base `.env` file or in the process environment.
      - **Secret Precedence within Infisical:** Secrets in the current environment folder override secrets from imported folders. For conflicts between multiple imports, the last one processed wins.
      - The fetched secrets are written to a new `.env.<environment>` file in the project root, sorted alphabetically. This caches the secrets for subsequent runs.
    - **On failed login:**
      - **With credentials present:**
        - **Authentication failures:** Explicit authentication failures (invalid credentials) fail hard with an error message and exit immediately. This prevents masking configuration issues.
        - **Environment not found:** If the specified environment slug is not found in Infisical, `env-run` logs informational and debug messages and falls back gracefully to using the base `.env` file and existing process environment variables.
      - **Without credentials present:** A warning is logged to the console and `env-run` falls back to using the base `.env` file and existing process environment variables.

3.  **Fallback to Base `.env` File:**
    - If no environment-specific file is found OR no --env value is passed, and Infisical login is not enabled by credentials, `env-run` will load the full set of variables from the base `.env` file at the monorepo root.
    - Variables from `.env` will override any existing process environment variables.

## Usage

```bash
pnpm env-run [flags] -- <command>
```

### Flags

| Flag                          | Description                                                                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--env <name>`                | Specify the environment (e.g., `dev-docker`, `staging`). This determines which `.env` file to use or which Infisical environment to target.                                         |
| `--overrides <key=value,...>` | Specify environment variable overrides with highest precedence. Supports both comma-separated format (`KEY1=value1,KEY2=value2`) and bracket format (`[KEY1=value1, KEY2=value2]`). |
| `--force-refresh`             | Forces `env-run` to fetch the latest secrets from Infisical, overwriting any existing `.env.<name>` file.                                                                           |
| `--debug`                     | Displays detailed debug tables showing environment variable sources and precedence. See [Debug Mode](#debug-mode) for details.                                                      |
| `--help`                      | Show the help message.                                                                                                                                                              |

## Debug Mode

The `--debug` flag provides comprehensive visibility into how `env-run` resolves environment variables from multiple sources. It displays two detailed tables that help troubleshoot configuration issues and understand variable precedence.

### Debug Output Structure

**Winning Environment Variables Table:**

- Shows the **final set** of environment variables that will be injected into the executed command
- Each variable displays its winning source and final value
- This represents the true environment that gets passed to your application

**Overridden Environment Variables Table:**

- Shows **all possible values** for each environment variable from **every available source**
- Includes variables that were overridden by higher-precedence sources
- Helps identify conflicts and understand why certain values were not used

### Environment Variable Precedence

Sources are listed in order of precedence (highest to lowest):

1. **`CLI Overrides`** - Environment variables specified via `--overrides` flag (highest precedence)
2. **`.env.<environment>`** - Environment-specific file (e.g., `.env.staging`)
3. **`Infisical`** - Secrets fetched from Infisical
4. **`.env`** - Base environment file in monorepo root
5. **`process`** - OS environment variables (lowest precedence)

### Debug Logic Details

- **Complete Source Analysis:** Debug mode loads variables from ALL potential sources, even when the core logic doesn't need them (e.g., when an environment-specific file exists, debug still shows what would have been loaded from `.env` and `process`)
- **Accurate Final Environment:** The "Winning" table shows the exact same environment variables that get passed to the executed command
- **Smart Process Filtering:** Process environment variables are filtered to exclude those that exist in .env files, showing only true OS-level variables
- **Consistent Sorting:** Variables are sorted first by source precedence (highest first), then alphabetically by name within each source

### Debug Output Example

```
Environment Variables Debug Information:
========================================

Winning Environment Variables
-----------------------------
Name                                       | Source             | Value
-------------------------------------------+--------------------+---------------------------------------------------------------------------------
NODE_ENV                                   | CLI Overrides      | production
API_KEY                                    | Infisical          | super-secret-key
DB_HOST                                    | Infisical          | db.prod.getgloo.com
API_URL                                    | .env.staging       | https://api.staging.getgloo.com/v1
DB_PORT                                    | .env               | 5432

Overridden Environment Variables
------------------------------
Name                                       | Source             | Value
-------------------------------------------+--------------------+---------------------------------------------------------------------------------
NODE_ENV                                   | Infisical          | staging
DB_HOST                                    | .env.staging       | db.staging.getgloo.com
API_URL                                    | .env               | https://api.getgloo.com/v1
DB_HOST                                    | .env               | db.getgloo.com
NODE_ENV                                   | .env               | development
DB_HOST                                    | process            | localhost
DB_PORT                                    | process            | 5432
NODE_ENV                                   | process            | development
```

### Examples

**Run a command using a local environment file:**
If `.env.dev-docker` exists, this command will load variables from it.

```bash
pnpm env-run --env=dev-docker -- nx serve api
```

**Override environment variables with bracket notation:**
Use CLI overrides to set specific variables with highest precedence.

```bash
pnpm env-run --env=dev-docker --overrides='[NODE_ENV=production, PORT=3000]' -- nx serve api
```

**Override environment variables with comma notation:**
You can also use comma-separated format for overrides.

```bash
pnpm env-run --env=dev-docker --overrides=NODE_ENV=production,PORT=3000 -- nx serve api
```

**Fetch secrets from Infisical for a "staging" environment:**
If `.env.staging` does not exist, this will fetch secrets from Infisical, create `.env.staging`, and then run the command.

```bash
pnpm env-run --env=staging -- nx test api
```

**Force a refresh of secrets from Infisical:**
This command will ignore any existing `.env.staging` file, pull the latest secrets from Infisical, update the file, and then run the command.

```bash
pnpm env-run --env=staging --force-refresh -- nx test api
```

**Refresh secrets without running a command:**
You can use `--force-refresh` without a command to just update the local environment file.

```bash
pnpm env-run --env=staging --force-refresh
```

**Debug environment variables with overrides:**
This will print detailed debug tables showing variable sources and precedence, including CLI overrides.

```bash
pnpm env-run --env=dev --overrides='[DB_HOST=localhost]' --debug -- node my-script.js
```

**Debug without executing a command:**
You can also use debug mode to inspect the environment setup without running any command.

```bash
pnpm env-run --env=staging --debug
```

**Run a command without passing an env value:**
If `.env` exists, this command will load variables from it.

```bash
pnpm env-run -- nx serve api
```
