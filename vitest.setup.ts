import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

const runtime = globalThis as typeof globalThis & {
  window?: { confirm?: (message?: string) => boolean };
};

if (runtime.window) {
  runtime.window.confirm = vi.fn(() => true);
}
