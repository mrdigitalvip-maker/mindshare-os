declare module "bun:test" {
  export const describe: (name: string, body: () => void) => void;
  type Test = {
    (name: string, body: () => unknown | Promise<unknown>): void;
    each<T extends readonly unknown[]>(values: readonly T[]): (
      name: string,
      body: (...values: T) => unknown | Promise<unknown>,
    ) => void;
  };
  export const test: Test;
  export function expect<T>(value: T): any;
  export const mock: any;
  export const beforeEach: (body: () => unknown | Promise<unknown>) => void;
  export const afterEach: (body: () => unknown | Promise<unknown>) => void;
}
