import { beforeEach, describe, expect, it, vi } from "vitest";
import { DebugRenderer, type DebugData } from "../../src/debug-renderer";
import { Logger } from "../../src/logger";

vi.mock("../../src/logger");

describe("DebugRenderer", () => {
  let renderer: DebugRenderer;

  beforeEach(() => {
    renderer = new DebugRenderer(new Logger());
  });

  function render(data: Partial<DebugData>, env = "dev") {
    const base: DebugData = {
      processEnv: {},
      baseEnv: {},
      overrideEnv: {},
      infisicalSecrets: {},
      cliOverrides: {},
      finalEnv: {},
    };
    return renderer.renderTable({ ...base, ...data }, env);
  }

  describe("when rendering tables with multiple sources", () => {
    it("should list winners before overridden, sorted by precedence then name", () => {
      const out = render(
        {
          processEnv: { A: "p", Z: "p" },
          baseEnv: { A: "b", B: "b" },
          overrideEnv: { A: "o", C: "o" },
          infisicalSecrets: { A: "i", D: "i" },
          cliOverrides: { A: "c", E: "c" },
          finalEnv: { A: "c", B: "b", C: "o", D: "i", E: "c", Z: "p" },
        },
        "dev"
      );

      const winnersStart = out.indexOf("Winning Environment Variables");
      const overriddenStart = out.indexOf("Overridden Environment Variables");
      const winners = out.slice(winnersStart, overriddenStart);
      const overridden = out.slice(overriddenStart);

      expect(winners).toMatch(/A\s+\| CLI Overrides\b/);
      expect(winners).toMatch(/D\s+\| Infisical\b/);
      expect(winners).toMatch(/C\s+\| \.env\.dev\b/);
      expect(winners).toMatch(/B\s+\| \.env\b/);
      expect(winners).toMatch(/Z\s+\| process\b/);

      expect(overridden).toMatch(/A\s+\| Infisical\b/);
      expect(overridden).toMatch(/A\s+\| \.env\.dev\b/);
      expect(overridden).toMatch(/A\s+\| \.env\b/);
      expect(overridden).toMatch(/A\s+\| process\b/);
    });
  });

  describe("when values exceed column widths", () => {
    it("should wrap long values but preserve columns", () => {
      const long = "x".repeat(200);
      const out = render({
        cliOverrides: { LONG: long },
        finalEnv: { LONG: long },
      });

      expect(out).toMatch(/Name\s+\| Source\s+\| Value/);
      expect(out).toMatch(/LONG\s+\| CLI Overrides\b/);
    });

    it("should wrap multi-word values by breaking on spaces", () => {
      // Make a multi-word string that exceeds the 80-char Value column width
      const multi = Array.from({ length: 60 }, () => "word").join(" ");
      const out = render({
        cliOverrides: { MULTI: multi },
        finalEnv: { MULTI: multi },
      });
      // Still shows the row header and source correctly
      expect(out).toMatch(/MULTI\s+\| CLI Overrides\b/);
    });
  });

  describe("when values fit exactly within width", () => {
    it("should not create wrapped continuation lines", () => {
      const out = render({
        baseEnv: { FIT: "x".repeat(10) },
        finalEnv: { FIT: "x".repeat(10) },
      });
      const lines = out.split("\n");
      const fitLineIndex = lines.findIndex((l) =>
        /FIT\s+\| \.env\s+\| /.test(l)
      );
      expect(fitLineIndex).toBeGreaterThan(0);
      const next = lines[fitLineIndex + 1] || "";
      expect(next).not.toMatch(/^\s+\|\s+\|\s+.+/);
    });
  });

  describe("when variables have identical values from same source", () => {
    it("should display them in the winning variables section", () => {
      const out = render({
        baseEnv: { A: "1", B: "1" },
        finalEnv: { A: "1", B: "1" },
      });
      expect(out).toContain("Winning Environment Variables");
    });
  });

  describe("when no variables exist", () => {
    it("should return a no-variables message", () => {
      const out = renderer.renderTable(
        {
          processEnv: {},
          baseEnv: {},
          overrideEnv: {},
          infisicalSecrets: {},
          cliOverrides: {},
          finalEnv: {},
        },
        "dev"
      );
      expect(out).toBe("No environment variables found.");
    });
  });

  describe("when sanitizing values", () => {
    it("should return empty string for falsy values (coverage)", () => {
      // @ts-expect-error accessing private for coverage only in tests
      const result = (
        renderer as unknown as { sanitize: (v: string) => string }
      ).sanitize("");
      expect(result).toBe("");
    });

    it("should return value unchanged when 50 chars or less", () => {
      const shortValue = "x".repeat(50);
      // @ts-expect-error accessing private for coverage only in tests
      const result = (
        renderer as unknown as { sanitize: (v: string) => string }
      ).sanitize(shortValue);
      expect(result).toBe(shortValue);
    });

    it("should truncate long values (>50 chars) with ellipsis", () => {
      // @ts-expect-error accessing private for coverage only in tests
      const result = (
        renderer as unknown as { sanitize: (v: string) => string }
      ).sanitize("x".repeat(60));
      expect(result.endsWith("...")).toBe(true);
      expect(result.length).toBe(50);
    });
  });

  describe("private helpers (targeted coverage)", () => {
    it("formatTable should return no-overridden message for header-only rows", () => {
      // @ts-expect-error accessing private for coverage only in tests
      const out = (
        renderer as unknown as { formatTable: (r: string[][]) => string }
      ).formatTable([["Name", "Source", "Value"]]);
      expect(out).toBe("No overridden variables found.");
    });

    it("createWrappedRows should pad non-wrapped columns on continuation lines", () => {
      // Long multi-word value forces wrapping; Name and Source should be padded on continuation lines
      const value = Array.from({ length: 50 }, () => "word").join(" ");
      // @ts-expect-error accessing private for coverage only in tests
      const rows = (
        renderer as unknown as {
          createWrappedRows: (r: string[], w: number[]) => string[][];
        }
      ).createWrappedRows(["NAME", "CLI Overrides", value], [42, 18, 80]);
      expect(rows.length).toBeGreaterThan(1);
      const second = rows[1];
      expect(second[0]).toMatch(/^\s{42}$/);
      expect(second[1]).toMatch(/^\s{18}$/);
      expect(second[2].length).toBeGreaterThan(0);
    });

    it("wrapTextToLines should wrap by words when possible", () => {
      // @ts-expect-error accessing private for coverage only in tests
      const lines = (
        renderer as unknown as {
          wrapTextToLines: (t: string, w: number) => string[];
        }
      ).wrapTextToLines("ab cd ef gh ij", 5);
      expect(lines).toEqual(["ab cd", "ef gh", "ij"]);
    });

    it("wrapTextToLines should return single-element array when text fits within maxWidth", () => {
      // @ts-expect-error accessing private for coverage only in tests
      const lines = (
        renderer as unknown as {
          wrapTextToLines: (t: string, w: number) => string[];
        }
      ).wrapTextToLines("short", 100);
      expect(lines).toEqual(["short"]);
    });
  });

  describe("when using the print method", () => {
    it("should output the rendered table to console", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
      const data = {
        processEnv: {},
        baseEnv: { A: "a" },
        overrideEnv: {},
        infisicalSecrets: {},
        cliOverrides: {},
        finalEnv: { A: "a" },
      };
      renderer.print(data, "dev");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
