import { expect, test } from "vitest";
test("Edition 9 frozen", () => expect(Object.freeze({ edition: 9 }).edition).toBe(9));
