import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

export type EnvSnapshot = Record<string, string | undefined>;

export function snapshotEnv(): EnvSnapshot {
  return { ...process.env };
}

export function restoreEnv(snapshot: EnvSnapshot): void {
  // Remove keys not present in snapshot
  for (const key of Object.keys(process.env)) {
    if (!(key in snapshot)) {
      delete process.env[key];
    }
  }
  // Restore keys
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

export async function withEnv<T>(
  tempEnv: Record<string, string | undefined>,
  fn: () => Promise<T> | T
): Promise<T> {
  const snap = snapshotEnv();
  try {
    for (const [k, v] of Object.entries(tempEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    return await fn();
  } finally {
    restoreEnv(snap);
  }
}

// Optional hooks for suites that want automatic isolation
export function installEnvIsolationHooks(): void {
  let snap: EnvSnapshot;
  beforeEach(() => {
    snap = snapshotEnv();
  });
  afterEach(() => {
    restoreEnv(snap);
  });
}

// Strict hermetic env: replace process.env with a blank object during tests.
export function installHermeticProcessEnvStrict(
  defaultEnv: Record<string, string> = { NODE_ENV: "test" }
): void {
  const originalEnv = process.env;
  const hermeticEnv = Object.create(null) as NodeJS.ProcessEnv;

  function resetToDefaults(): void {
    for (const key of Object.keys(hermeticEnv)) {
      delete hermeticEnv[key];
    }
    for (const [k, v] of Object.entries(defaultEnv)) {
      hermeticEnv[k] = String(v);
    }
  }

  beforeAll(() => {
    resetToDefaults();
    // @ts-expect-error test override
    process.env = hermeticEnv;
  });

  beforeEach(() => {
    resetToDefaults();
  });

  afterEach(() => {
    // per-test withEnv changes are reset in beforeEach
  });

  afterAll(() => {
    // Restore for any tooling post-run
    // @ts-expect-error test restore
    process.env = originalEnv;
  });
}
