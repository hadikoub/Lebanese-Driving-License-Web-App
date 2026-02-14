import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AppStateProvider } from "./AppState";
import { questionSetFixture } from "./test-fixtures";

describe("RTL app shell", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qcm_ar_question_set", JSON.stringify(questionSetFixture));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  });

  it("renders Arabic layout with RTL direction", async () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <AppStateProvider>
          <App />
        </AppStateProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole("heading", { name: "اختبار السياقة QCM" })).toBeInTheDocument();
    expect(container.querySelector(".app-shell")).toHaveAttribute("dir", "rtl");
  });
});
