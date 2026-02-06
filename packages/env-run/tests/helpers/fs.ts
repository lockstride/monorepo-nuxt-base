import * as fs from "node:fs";
import { vi } from "vitest";

export type FsMocks = {
  existsSync: ReturnType<typeof vi.fn>;
  readFileSync: ReturnType<typeof vi.fn>;
  writeFileSync: ReturnType<typeof vi.fn>;
};

export function installFsMocks(): FsMocks {
  vi.mock("node:fs", () => ({
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    realpathSync: vi.fn(),
  }));

  const mockedFs = fs as unknown as FsMocks;
  return mockedFs;
}

export function setFsFiles(
  files: Record<string, string>,
  mocks: FsMocks
): void {
  mocks.existsSync.mockImplementation((path: string | Buffer | URL) => {
    const p = path.toString();
    return Object.prototype.hasOwnProperty.call(files, p);
  });
  mocks.readFileSync.mockImplementation((path: string | Buffer | URL) => {
    const p = path.toString();
    if (!Object.prototype.hasOwnProperty.call(files, p)) {
      throw new Error(`ENOENT: no such file or directory, open '${p}'`);
    }
    return files[p];
  });

  mocks.writeFileSync.mockImplementation(
    (path: string | Buffer | URL, data: string | Uint8Array) => {
      const p = path.toString();
      const content = typeof data === "string" ? data : data.toString();
      files[p] = content;
      return undefined as unknown as void;
    }
  );
}
