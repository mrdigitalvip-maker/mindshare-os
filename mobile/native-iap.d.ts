declare module "react-native-iap" {
  export type Purchase = Record<string, unknown>;
  export function initConnection(): Promise<boolean>;
  export function fetchProducts(input: {
    skus: string[];
    type: "subs" | "in-app";
  }): Promise<Record<string, unknown>[]>;
  export function requestPurchase(input: Record<string, unknown>): Promise<Purchase | Purchase[]>;
  export function getAvailablePurchases(): Promise<Purchase[]>;
  export function finishTransaction(input: {
    purchase: Purchase;
    isConsumable: boolean;
  }): Promise<void>;
}
declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function expect(value: unknown): any;
}
