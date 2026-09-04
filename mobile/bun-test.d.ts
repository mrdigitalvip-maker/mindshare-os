declare module "bun:test" {
  export const describe: (name: string, body: () => void) => void;
  type Test = {
    (name: string, body: () => unknown | Promise<unknown>): void;
    each<T extends readonly unknown[]>(
      values: readonly T[],
    ): (name: string, body: (...values: T) => unknown | Promise<unknown>) => void;
  };
  export const test: Test;
  type Matcher = {
    not: Matcher;
    rejects: Matcher;
    resolves: Matcher;
    toBe(...values: unknown[]): void;
    toBeCloseTo(...values: unknown[]): void;
    toBeFalse(...values: unknown[]): void;
    toBeGreaterThan(...values: unknown[]): void;
    toBeLessThan(...values: unknown[]): void;
    toBeNull(...values: unknown[]): void;
    toBeTrue(...values: unknown[]): void;
    toBeTruthy(...values: unknown[]): void;
    toBeUndefined(...values: unknown[]): void;
    toContain(...values: unknown[]): void;
    toEqual(...values: unknown[]): void;
    toHaveLength(...values: unknown[]): void;
    toHaveProperty(...values: unknown[]): void;
    toBeInstanceOf(...values: unknown[]): void;
    toMatch(...values: unknown[]): void;
    toMatchObject(...values: unknown[]): void;
    toStartWith(...values: unknown[]): void;
    toThrow(...values: unknown[]): void;
  };
  export function expect<T>(value: T): Matcher;
  export const mock: Record<string, unknown>;
  export const beforeEach: (body: () => unknown | Promise<unknown>) => void;
  export const afterEach: (body: () => unknown | Promise<unknown>) => void;
}
