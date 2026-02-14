import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AppStateProvider } from "./AppState";
import { questionSetFixture } from "./test-fixtures";

function setup(initialPath: string): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </MemoryRouter>
  );
}

describe("admin + story", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qcm_ar_question_set", JSON.stringify(questionSetFixture));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  });

  it("blocks review page for normal mode", async () => {
    setup("/review");

    expect(await screen.findByRole("heading", { name: /هذه الصفحة للمشرف فقط/i })).toBeInTheDocument();
  });

  it("enables admin mode with passcode", async () => {
    setup("/admin");

    const passwordInput = await screen.findByPlaceholderText("أدخل رمز المرور");
    const confirmInput = await screen.findByPlaceholderText("أعد إدخال الرمز");
    await userEvent.type(passwordInput, "myStrongPass");
    await userEvent.type(confirmInput, "myStrongPass");
    await userEvent.click(screen.getByRole("button", { name: /حفظ وتفعيل Admin Mode/i }));

    expect(await screen.findByText(/تم تفعيل Admin Mode/i)).toBeInTheDocument();
  });

  it("shows story levels with lock state", async () => {
    setup("/story");

    expect(await screen.findByRole("heading", { name: /story mode/i })).toBeInTheDocument();
    expect(screen.getByText(/المستوى 1 - Law/i)).toBeInTheDocument();
    expect(screen.getByText(/المستوى 2 - Safety/i)).toBeInTheDocument();
    expect(screen.getByText(/مغلق حتى إنهاء المستوى السابق/i)).toBeInTheDocument();
  });
});
