import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AppStateProvider } from "./AppState";
import { questionSetFixture } from "./test-fixtures";

const flashcardsFixture = {
  id: "road-signs-flashcards-ar-v1",
  titleAr: "بطاقات إشارات السير",
  language: "ar",
  direction: "rtl",
  importedAt: "2026-02-15T00:00:00.000Z",
  cards: [
    {
      id: "sf-0001",
      sourceId: 1,
      type: "Warning",
      nameAr: "منعطف لليمين",
      imagePath: "/assets/sign_images_by_id/001.png"
    }
  ]
};

function setup(initialPath: string): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </MemoryRouter>
  );
}

describe("signs flashcards page", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qcm_ar_question_set", JSON.stringify(questionSetFixture));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/data/signs.flashcards.ar.generated.json")) {
          return new Response(JSON.stringify(flashcardsFixture), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      })
    );
  });

  it("starts session and reveals arabic sign name", async () => {
    setup("/signs/flashcards");

    await screen.findByRole("heading", { name: /Signs Flashcards/i });
    await userEvent.click(screen.getByRole("button", { name: /بدء البطاقات/i }));
    expect(await screen.findByText(/اضغط "إظهار الاسم"/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /إظهار الاسم/i }));
    expect(screen.getByText("منعطف لليمين")).toBeInTheDocument();
  });
});
