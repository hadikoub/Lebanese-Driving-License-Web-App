import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AppStateProvider } from "./AppState";
import { questionSetFixture } from "./test-fixtures";

function setupRoute(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </MemoryRouter>
  );
}

describe("quiz modes", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("qcm_ar_question_set", JSON.stringify(questionSetFixture));
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  });

  it("shows immediate feedback in practice mode", async () => {
    setupRoute("/quiz/practice");

    await screen.findByRole("heading", { name: /إعداد وضع التدريب/i });
    await userEvent.click(screen.getByRole("radio", { name: /اختيار أنواع محددة/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Law" }));
    await userEvent.click(screen.getByRole("button", { name: /بدء التدريب/i }));

    expect(screen.getByRole("button", { name: /^A\s/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^B\s/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^C\s/i })).toBeInTheDocument();

    const wrongChoice = await screen.findByRole("button", { name: /مرور/i });
    await userEvent.click(wrongChoice);

    const feedback = screen.getByText(/إجابة غير صحيحة/i);
    expect(feedback).toBeInTheDocument();
    expect(feedback).toHaveTextContent(/اختيارك:/i);
    expect(feedback).toHaveTextContent(/الصحيح:/i);
    expect(feedback).toHaveTextContent(/توقف/i);
  });

  it("defers feedback in exam mode and computes final score", async () => {
    setupRoute("/quiz/exam");
    await screen.findByRole("heading", { name: /إعداد وضع الامتحان/i });
    await userEvent.click(screen.getByRole("radio", { name: /اختيار أنواع محددة/i }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Law" }));
    await userEvent.click(screen.getByRole("button", { name: /بدء الامتحان/i }));

    await userEvent.click(await screen.findByRole("button", { name: /توقف/i }));
    fireEvent.click(screen.getByRole("button", { name: /^إنهاء$/i }));

    expect(await screen.findByRole("heading", { name: "نتيجة الاختبار" })).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.queryByText(/إجابة غير صحيحة/i)).not.toBeInTheDocument();
  });

  it("renders sign image when question has signPath", async () => {
    const signQuestionSet = {
      ...questionSetFixture,
      questions: [
        {
          ...questionSetFixture.questions[0],
          id: "q-sign",
          questionType: "Signs",
          signPath: "/assets/signs/1.svg"
        }
      ]
    };
    localStorage.setItem("qcm_ar_question_set", JSON.stringify(signQuestionSet));

    setupRoute("/quiz/practice");
    await screen.findByRole("heading", { name: /إعداد وضع التدريب/i });
    await userEvent.click(screen.getByRole("button", { name: /بدء التدريب/i }));

    const signImage = await screen.findByRole("img", { name: /إشارة مرورية مرتبطة بالسؤال/i });
    expect(signImage).toHaveAttribute("src", "/assets/signs/1.svg");
  });

  it("supports bookmark-only practice and persists bookmarks after remount", async () => {
    const firstApp = setupRoute("/quiz/practice");
    await screen.findByRole("heading", { name: /إعداد وضع التدريب/i });
    await userEvent.click(screen.getByRole("button", { name: /بدء التدريب/i }));
    await userEvent.click(await screen.findByRole("button", { name: /حفظ السؤال/i }));
    await userEvent.click(screen.getByRole("button", { name: /إنهاء الاختبار الآن/i }));
    firstApp.unmount();

    setupRoute("/quiz/practice");
    await screen.findByRole("heading", { name: /إعداد وضع التدريب/i });
    expect(screen.getByText(/عدد الأسئلة المحفوظة: 1/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("checkbox", { name: /تدريب على الأسئلة المحفوظة فقط/i }));
    await userEvent.click(screen.getByRole("button", { name: /بدء التدريب/i }));
    expect(await screen.findByRole("button", { name: /محفوظ/i })).toBeInTheDocument();
  });
});
