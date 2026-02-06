import type { ChildProcess } from "node:child_process";
import { vi } from "vitest";

type EventCallback = (...args: unknown[]) => void;

export function installSpawnMock() {
  const events: Record<string, Array<EventCallback>> = {};

  const child = {
    on: vi.fn().mockImplementation((event: string, cb: EventCallback) => {
      events[event] = events[event] || [];
      events[event].push(cb);
      return child as unknown as ChildProcess;
    }),
  } as unknown as ChildProcess;

  const spawn = vi.fn().mockReturnValue(child);

  function emit(event: string, ...args: unknown[]) {
    (events[event] || []).forEach((cb) => cb(...args));
  }

  return { spawn, child, emit };
}
