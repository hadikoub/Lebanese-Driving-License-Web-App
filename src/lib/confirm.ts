export function confirmAction(message: string): boolean {
  if (typeof window === "undefined" || typeof window.confirm !== "function") {
    return true;
  }

  try {
    return window.confirm(message);
  } catch {
    return true;
  }
}
