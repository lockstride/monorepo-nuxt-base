export const helpText = `
NAME
  env-run - A command-line utility for managing and injecting environment variables.

SYNOPSIS
  env-run [options] -- <command>

DESCRIPTION
  env-run executes a command after loading environment variables from .env files and/or Infisical.
  It provides a consistent way to manage environment configuration across different environments
  such as development, testing, and production.

OPTIONS
  --env <name>
    Specify the environment to use (e.g., dev-docker, staging). This determines which .env file
    to load (.env.<name>) or which environment to fetch from Infisical.

  --overrides <key=value,...>
    Specify environment variable overrides & additions with highest precedence. Supports both
    comma-separated format (KEY1=value1,KEY2=value2) and bracket format ([KEY1=value1, KEY2=value2]).

  --force-refresh
    Forces env-run to fetch the latest secrets from Infisical, overwriting any cached
    .env.<name> file. Can be used without a command to only refresh the secrets.

  --debug
    Displays a detailed table showing the source of each environment variable (process, .env,
    .env.<name>, Infisical, or CLI overrides) and which values were overridden.

  --help
    Displays this help message.

EXAMPLES
  - Run a command using a local environment file:
    $ env-run --env=dev-docker -- nx serve api

  - Override specific environment variables:
    $ env-run --env=dev --overrides='[NODE_ENV=production, PORT=3000]' -- nx serve api

  - Override variables with comma format:
    $ env-run --env=dev --overrides=NODE_ENV=production,PORT=3000 -- nx serve api

  - Fetch secrets from Infisical for a "staging" environment:
    $ env-run --env=staging -- nx test api

  - Force a refresh of secrets from Infisical and run a command:
    $ env-run --env=staging --force-refresh -- nx test api

  - Refresh secrets without running a command:
    $ env-run --env=staging --force-refresh

  - Debug environment variables with overrides:
    $ env-run --env=dev --overrides='[DB_HOST=localhost]' --debug -- node my-script.js
`;
