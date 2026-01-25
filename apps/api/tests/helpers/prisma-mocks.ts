import type { HelloWorldMessage } from "@oxford-heavy/data-sources-prisma";

export type PrismaHelloWorldMessageMock = {
  findFirst: (...args: unknown[]) => Promise<HelloWorldMessage | null>;
};

export type PrismaMock = {
  $queryRaw?: (...args: unknown[]) => Promise<unknown>;
  helloWorldMessage?: PrismaHelloWorldMessageMock;
};

export function createPrismaMock(
  overrides: Partial<PrismaMock> = {}
): PrismaMock {
  const defaultHelloWorld: PrismaHelloWorldMessageMock = {
    findFirst: async () => null,
  };

  const defaults: PrismaMock = {
    $queryRaw: async () => 1,
    helloWorldMessage: defaultHelloWorld,
  };

  return {
    ...defaults,
    ...overrides,
    helloWorldMessage: {
      ...defaultHelloWorld,
      ...(overrides.helloWorldMessage || {}),
    },
  };
}

export function prismaWithHealthyDb(): PrismaMock {
  return createPrismaMock({ $queryRaw: async () => 1 });
}

export function prismaWithUnhealthyDb(errorMessage = "db error"): PrismaMock {
  return createPrismaMock({
    $queryRaw: async () => {
      throw new Error(errorMessage);
    },
  });
}

export function prismaWithHelloWorldMessage(
  message: HelloWorldMessage | null
): PrismaMock {
  return createPrismaMock({
    helloWorldMessage: {
      findFirst: async () => message,
    },
  });
}
