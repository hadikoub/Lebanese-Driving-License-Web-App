import type { QuestionSet } from "../types/qcm";
import { isQuestionSet } from "./validation";

async function readAsText(file: File): Promise<string> {
  if (typeof file.text === "function") {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("تعذر قراءة الملف"));
    reader.readAsText(file);
  });
}

export async function readQuestionSetFile(file: File): Promise<QuestionSet> {
  const text = await readAsText(file);
  const data = JSON.parse(text) as unknown;
  if (!isQuestionSet(data)) {
    throw new Error("صيغة الملف غير صحيحة");
  }
  return data;
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
