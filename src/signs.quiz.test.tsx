import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AppStateProvider } from "./AppState";
import { questionSetFixture } from "./test-fixtures";

const signsQuizFixture = {
  id: "road-signs-quiz-ar-v1",
  titleAr: "اختبار إشارات السير",
  language: "ar",
  direction: "rtl",
  importedAt: "2026-02-15T00:00:00.000Z",
  questions: [
    {
      id: "sq-0001",
      sourceId: 1,
      type: "Warning",
      imagePath: "/assets/sign_images_by_id/001.png",
      optionsAr: ["منعطف لليمين", "منعطف لليسار", "مستشفى"],
      correctOptionIndex: 0,
      correctAnswerAr: "منعطف لليمين"
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

describe("signs quiz page", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qcm_ar_question_set", JSON.stringify(questionSetFixture));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/data/signs.quiz.ar.generated.json")) {
          return new Response(JSON.stringify(signsQuizFixture), { status: 200 });
        }
        return new Response("{}", { status: 404 });
      })
    );
  });

  it("shows immediate feedback in practice mode", async () => {
    setup("/signs/quiz");

    await screen.findByRole("heading", { name: /Signs Quiz/i });
    await userEvent.click(screen.getByRole("button", { name: /بدء التدريب/i }));
    await userEvent.click(await screen.findByRole("button", { name: /منعطف لليسار/i }));

    expect(screen.getByText(/إجابة غير صحيحة/i)).toBeInTheDocument();
    expect(screen.getByText(/الصحيح: منعطف لليمين/i)).toBeInTheDocument();
  });

  it("defers feedback in exam mode and shows final score", async () => {
    setup("/signs/quiz");

    await screen.findByRole("heading", { name: /Signs Quiz/i });
    await userEvent.selectOptions(screen.getByLabelText("الوضع"), "exam");
    await userEvent.click(screen.getByRole("button", { name: /بدء الامتحان/i }));
    await userEvent.click(await screen.findByRole("button", { name: /منعطف لليسار/i }));

    expect(screen.queryByText(/إجابة غير صحيحة/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /إنهاء الاختبار الآن/i }));
    expect(await screen.findByText(/نتيجة آخر جلسة/i)).toBeInTheDocument();
    expect(screen.getByText(/الدرجة: 0 \/ 1/i)).toBeInTheDocument();
  });
});
