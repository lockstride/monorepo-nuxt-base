import { describe, expect, it, vi } from "vitest";
import { parseArgs, parseOverrides } from "../../src/index";

describe("EnvRun args", () => {
  describe("when parsing override arguments", () => {
    it("should parse overrides in bracket form", () => {
      const original = process.argv;
      try {
        process.argv = [
          "node",
          "env-run",
          "--env=dev",
          "--overrides=[NODE_ENV=production, PORT=3000]",
          "--",
          "echo",
          "hi",
        ];
        const parsed = parseArgs();
        expect(parsed.env).toBe("dev");
        expect(parsed.overrides).toEqual(["NODE_ENV=production", "PORT=3000"]);
        expect(parsed.command).toEqual(["echo", "hi"]);
      } finally {
        process.argv = original;
      }
    });

    it("should parse overrides in comma form", () => {
      const original = process.argv;
      try {
        process.argv = [
          "node",
          "env-run",
          "--env=staging",
          "--overrides=FOO=bar,BAZ=buz",
          "--",
          "npm",
          "start",
        ];
        const parsed = parseArgs();
        expect(parsed.env).toBe("staging");
        expect(parsed.overrides).toEqual(["FOO=bar", "BAZ=buz"]);
        expect(parsed.command).toEqual(["npm", "start"]);
      } finally {
        process.argv = original;
      }
    });

    it("should handle --overrides as separate token", () => {
      const original = process.argv;
      try {
        process.argv = [
          "node",
          "env-run",
          "--env",
          "dev",
          "--overrides",
          "FOO=bar,BAZ=buz",
          "--",
          "echo",
          "x",
        ];
        const parsed = parseArgs();
        expect(parsed.env).toBe("dev");
        expect(parsed.overrides).toEqual(["FOO=bar", "BAZ=buz"]);
        expect(parsed.command).toEqual(["echo", "x"]);
      } finally {
        process.argv = original;
      }
    });
  });

  describe("when parsing flag arguments", () => {
    it("should parse force-refresh and help flags", () => {
      const original = process.argv;
      try {
        process.argv = [
          "node",
          "env-run",
          "--env",
          "prod",
          "--force-refresh",
          "--help",
        ];
        const parsed = parseArgs();
        expect(parsed.env).toBe("prod");
        expect(parsed.forceRefresh).toBe(true);
        expect(parsed.help).toBe(true);
      } finally {
        process.argv = original;
      }
    });

    it("should parse help path (no command and no force-refresh)", () => {
      const original = process.argv;
      try {
        process.argv = ["node", "env-run", "--help"];
        const parsed = parseArgs();
        expect(parsed.help).toBe(true);
        expect(parsed.command).toEqual([]);
      } finally {
        process.argv = original;
      }
    });

    it("should parse debug flag and command after --", () => {
      const original = process.argv;
      try {
        process.argv = ["node", "env-run", "--debug", "--", "echo", "x"];
        const parsed = parseArgs();
        expect(parsed.debug).toBe(true);
        expect(parsed.command).toEqual(["echo", "x"]);
      } finally {
        process.argv = original;
      }
    });
  });

  describe("when parsing commands", () => {
    it("should treat remaining args as command without -- separator", async () => {
      const original = process.argv;
      try {
        process.argv = ["node", "env-run", "node", "script.js"]; // no --
        const parsed = parseArgs();
        expect(parsed.command).toEqual(["node", "script.js"]);
      } finally {
        process.argv = original;
      }
    });

    it("should ignore unknown flags that start with -", async () => {
      const original = process.argv;
      try {
        process.argv = ["node", "env-run", "--unknown-flag", "--", "echo", "x"];
        const parsed = parseArgs();
        // Unknown flag is ignored, command is captured after --
        expect(parsed.command).toEqual(["echo", "x"]);
      } finally {
        process.argv = original;
      }
    });
  });

  describe("parseOverrides utility function", () => {
    it("should handle empty and stray commas", () => {
      expect(parseOverrides("[]")).toEqual([]);
      expect(parseOverrides("   ")).toEqual([]);
      expect(parseOverrides("A=1,")).toEqual(["A=1"]);
    });
  });

  describe("findMonorepoRoot utility function", () => {
    it("should throw when no workspace file exists", async () => {
      vi.doMock("node:fs", async (importOriginal) => {
        const actual = await importOriginal();
        return {
          ...actual,
          existsSync: vi.fn().mockReturnValue(false),
        };
      });
      vi.resetModules();
      const { findMonorepoRoot } = await import("../../src/index");
      expect(() => findMonorepoRoot("/a/b/c")).toThrow(
        /Could not find monorepo root/
      );
    });
  });
});
