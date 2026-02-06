import { describe, expect, it } from "vitest";
import { helpText } from "../../src/help-text";

describe("EnvRun help text", () => {
  describe("when displaying help content", () => {
    it("should include all required sections and command flags", () => {
      expect(helpText).toMatch(/NAME\n\s+env-run/);
      expect(helpText).toMatch(/SYNOPSIS/);
      expect(helpText).toMatch(/OPTIONS/);
      expect(helpText).toMatch(/--env <name>/);
      expect(helpText).toMatch(/--overrides/);
      expect(helpText).toMatch(/--force-refresh/);
      expect(helpText).toMatch(/--debug/);
      expect(helpText).toMatch(/--help/);
      expect(helpText).toMatch(/EXAMPLES/);
    });
  });
});
