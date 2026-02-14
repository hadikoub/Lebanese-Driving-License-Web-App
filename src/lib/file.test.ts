import { describe, expect, it } from "vitest";
import { readQuestionSetFile } from "./file";
import { questionSetFixture } from "../test-fixtures";

describe("file import/export", () => {
  it("parses a valid JSON question set", async () => {
    const file = new File([JSON.stringify(questionSetFixture)], "questions.json", {
      type: "application/json"
    });

    const parsed = await readQuestionSetFile(file);
    expect(parsed.id).toBe(questionSetFixture.id);
    expect(parsed.questions).toHaveLength(2);
  });
});
