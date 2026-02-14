import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { Choice, QuestionSet } from "../src/types/qcm";

const DEFAULT_CSV_PATH = path.resolve("answers-driving-exams-parsed.csv");
const OUTPUT_JSON_PATH = path.resolve("data/questions.ar.generated.json");
const OUTPUT_REPORT_PATH = path.resolve("data/extraction-report.json");
const PUBLIC_OUTPUT_JSON_PATH = path.resolve("public/data/questions.ar.generated.json");
const SIGNS_ASSETS_SOURCE_PATH = path.resolve("assets/signs");
const SIGNS_ASSETS_PUBLIC_PATH = path.resolve("public/assets/signs");

interface CsvRecord {
  [key: string]: string;
}

interface CsvExtractionReport {
  sourceCsvPath: string;
  generatedAt: string;
  totalRows: number;
  questionsExtracted: number;
  needsReviewCount: number;
  missingAnswerKeyCount: number;
  signsWithImageCount: number;
  signsMissingImageCount: number;
  rowsSkipped: number;
  signsAssetsSynced: boolean;
}

function readCsvRows(content: string): string[][] {
  const cleaned = content.replace(/^\ufeff/, "").replace(/\r/g, "");
  const rows: string[][] = [];

  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < cleaned.length; index += 1) {
    const char = cleaned[index];

    if (char === '"') {
      const nextChar = cleaned[index + 1];
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    if (row.some((value) => value.length > 0)) {
      rows.push(row);
    }
  }

  return rows;
}

function rowsToRecords(rows: string[][]): CsvRecord[] {
  if (rows.length === 0) return [];

  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((row) => {
    const record: CsvRecord = {};
    for (let index = 0; index < headers.length; index += 1) {
      record[headers[index]] = (row[index] ?? "").trim();
    }
    return record;
  });
}

function optionIdByIndex(index: number): string {
  const options = ["A", "B", "C", "D"];
  return options[index] ?? `OPT${index + 1}`;
}

function normalizeCompareText(value: string): string {
  return value
    .replace(/[\s\.,،:؛!?؟"'`]/g, "")
    .replace(/[\u0640]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeCategory(value: string): string | null {
  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeQuestionType(value: string, category: string | null): string | null {
  const normalized = value.trim();
  if (normalized.length === 0) return null;

  const lower = normalized.toLowerCase();
  const formatted = `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
  const upper = formatted.toUpperCase();

  if (["A", "BC", "C", "G"].includes(upper)) {
    return null;
  }
  if (category && upper === category.toUpperCase()) {
    return null;
  }
  return formatted;
}

function normalizeSignPath(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const normalized = trimmed.replace(/\\/g, "/");
  if (/^https?:\/\//i.test(normalized) || normalized.startsWith("/")) {
    return normalized;
  }

  const withoutPrefix = normalized
    .replace(/^\.?\//, "")
    .replace(/^public\/assets\/signs\//i, "")
    .replace(/^assets\/signs\//i, "")
    .replace(/^signs\//i, "");

  return `/assets/signs/${withoutPrefix}`;
}

function extractChoices(record: CsvRecord): Choice[] {
  const optionKeys = Object.keys(record)
    .filter((key) => /^option\s+\d+$/i.test(key))
    .sort((left, right) => {
      const leftNumber = Number.parseInt(left.replace(/\D/g, ""), 10);
      const rightNumber = Number.parseInt(right.replace(/\D/g, ""), 10);
      return leftNumber - rightNumber;
    });

  return optionKeys
    .map((key, index) => ({
      id: optionIdByIndex(index),
      textAr: (record[key] ?? "").trim()
    }))
    .filter((choice) => choice.textAr.length > 0);
}

function resolveCorrectChoiceId(record: CsvRecord, choices: Choice[]): string | null {
  const indexRaw = (record["Correct Answer Index"] ?? "").trim();
  const parsedIndex = Number.parseInt(indexRaw, 10);

  if (!Number.isNaN(parsedIndex) && parsedIndex >= 1 && parsedIndex <= choices.length) {
    return choices[parsedIndex - 1].id;
  }

  const correctAnswerText = (record["Correct Answer"] ?? "").trim();
  if (correctAnswerText.length === 0) return null;

  const target = normalizeCompareText(correctAnswerText);
  const matchedChoice = choices.find((choice) => normalizeCompareText(choice.textAr) === target);
  return matchedChoice?.id ?? null;
}

export function buildQuestionSetFromCsv(csvContent: string): {
  questionSet: QuestionSet;
  report: CsvExtractionReport;
} {
  const rows = readCsvRows(csvContent);
  const records = rowsToRecords(rows);

  const questions = records
    .map((record, index) => {
      const prompt = (record["Question Text (نص السؤال)"] ?? record["Question Text"] ?? "").trim();
      const choices = extractChoices(record);
      const sourceNumberRaw = (record["ID"] ?? "").trim();
      const sourceNumber = Number.parseInt(sourceNumberRaw, 10);
      const correctChoiceId = resolveCorrectChoiceId(record, choices);
      const category = normalizeCategory(record["Cat"] ?? "");
      const questionType = normalizeQuestionType(record["Type"] ?? "", category);
      const signPath = normalizeSignPath(record["Sign Path"] ?? "");
      const needsReview =
        prompt.length < 6 ||
        choices.length < 2 ||
        !correctChoiceId ||
        (questionType?.toLowerCase() === "signs" && !signPath);

      if (!prompt) {
        return null;
      }

      return {
        id: `q-${String(index + 1).padStart(4, "0")}`,
        promptAr: prompt,
        choices,
        correctChoiceId,
        sourcePage: 0,
        sourceNumber: Number.isNaN(sourceNumber) ? null : sourceNumber,
        needsReview,
        category,
        questionType,
        ...(signPath ? { signPath } : {})
      };
    })
    .filter((question): question is NonNullable<typeof question> => question !== null);

  const questionSet: QuestionSet = {
    id: "exam-questions-ar-v1",
    titleAr: "أسئلة امتحان السياقة",
    language: "ar",
    direction: "rtl",
    questions,
    importedAt: new Date().toISOString()
  };

  const report: CsvExtractionReport = {
    sourceCsvPath: "",
    generatedAt: new Date().toISOString(),
    totalRows: records.length,
    questionsExtracted: questions.length,
    needsReviewCount: questions.filter((question) => question.needsReview).length,
    missingAnswerKeyCount: questions.filter((question) => !question.correctChoiceId).length,
    signsWithImageCount: questions.filter(
      (question) => question.questionType?.toLowerCase() === "signs" && Boolean(question.signPath)
    ).length,
    signsMissingImageCount: questions.filter(
      (question) => question.questionType?.toLowerCase() === "signs" && !question.signPath
    ).length,
    rowsSkipped: records.length - questions.length,
    signsAssetsSynced: false
  };

  return { questionSet, report };
}

async function syncSignAssetsIfPresent(): Promise<boolean> {
  if (!existsSync(SIGNS_ASSETS_SOURCE_PATH)) {
    return false;
  }

  await fs.mkdir(path.dirname(SIGNS_ASSETS_PUBLIC_PATH), { recursive: true });
  await fs.cp(SIGNS_ASSETS_SOURCE_PATH, SIGNS_ASSETS_PUBLIC_PATH, { recursive: true });
  return true;
}

async function writeOutputs(questionSet: QuestionSet, report: CsvExtractionReport): Promise<void> {
  await fs.mkdir(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  await fs.mkdir(path.dirname(OUTPUT_REPORT_PATH), { recursive: true });
  await fs.mkdir(path.dirname(PUBLIC_OUTPUT_JSON_PATH), { recursive: true });

  report.signsAssetsSynced = await syncSignAssetsIfPresent();

  const outputJson = JSON.stringify(questionSet, null, 2);
  await fs.writeFile(OUTPUT_JSON_PATH, outputJson, "utf8");
  await fs.writeFile(PUBLIC_OUTPUT_JSON_PATH, outputJson, "utf8");
  await fs.writeFile(OUTPUT_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
}

async function main(): Promise<void> {
  const csvPath = process.argv[2] ?? DEFAULT_CSV_PATH;
  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const csvContent = await fs.readFile(csvPath, "utf8");
  const { questionSet, report } = buildQuestionSetFromCsv(csvContent);
  report.sourceCsvPath = csvPath;
  await writeOutputs(questionSet, report);

  // eslint-disable-next-line no-console
  console.log(`Generated ${questionSet.questions.length} questions from CSV`);
  // eslint-disable-next-line no-console
  console.log(`Needs review: ${report.needsReviewCount}`);
  // eslint-disable-next-line no-console
  console.log(`Signs with image: ${report.signsWithImageCount} | missing image: ${report.signsMissingImageCount}`);
  // eslint-disable-next-line no-console
  console.log(`Signs assets synced: ${report.signsAssetsSynced ? "yes" : "no"}`);
  // eslint-disable-next-line no-console
  console.log(`Output: ${OUTPUT_JSON_PATH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
