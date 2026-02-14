import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AppStateProvider } from "./AppState";
import { questionSetFixture } from "./test-fixtures";

function setupRoute(initialPath: string): void {
  render(
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
    await userEvent.click(screen.getByRole("radio", { name: /نوع واحد فقط/i }));
    await userEvent.selectOptions(screen.getByLabelText("اختر النوع"), "Safety");
    await userEvent.click(screen.getByRole("button", { name: /بدء التدريب/i }));

    const wrongChoice = await screen.findByRole("button", { name: /B مرور/i });
    await userEvent.click(wrongChoice);

    expect(screen.getByText(/إجابة غير صحيحة/i)).toBeInTheDocument();
    expect(screen.getByText(/الصحيح هو: A/i)).toBeInTheDocument();
  });

  it("defers feedback in exam mode and computes final score", async () => {
    setupRoute("/quiz/exam");
    await screen.findByRole("heading", { name: /إعداد وضع الامتحان/i });
    await userEvent.click(screen.getByRole("button", { name: /بدء الامتحان/i }));

    const firstCorrect =
      (await screen.queryByRole("button", { name: /A توقف/i })) ??
      (await screen.findByRole("button", { name: /B تشغيل الغماز/i }));
    await userEvent.click(firstCorrect);
    fireEvent.click(screen.getByRole("button", { name: "التالي" }));

    const secondCorrect =
      (await screen.queryByRole("button", { name: /A توقف/i })) ??
      (await screen.findByRole("button", { name: /B تشغيل الغماز/i }));
    await userEvent.click(secondCorrect);
    fireEvent.click(screen.getByRole("button", { name: "إنهاء" }));

    expect(await screen.findByRole("heading", { name: "نتيجة الاختبار" })).toBeInTheDocument();
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
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
});
