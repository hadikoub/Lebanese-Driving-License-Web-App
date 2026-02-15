import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { SignFlashcardSet, SignQuizSet } from "../src/types/signs";

const DEFAULT_FLASHCARDS_CSV_PATH = path.resolve("Road_Signs_Quiz_FlashCard.csv");
const DEFAULT_QUIZ_CSV_PATH = path.resolve("Road_Signs_Quiz_Version.csv");
const SIGNS_IMAGES_SOURCE_PATH = path.resolve("sign_images_by_id");
const SIGNS_IMAGES_PUBLIC_PATH = path.resolve("public/assets/sign_images_by_id");
const SUPPORTED_SIGN_EXTENSIONS = [".png", ".svg", ".jpg", ".jpeg", ".webp"];

const OUTPUT_FLASHCARDS_JSON_PATH = path.resolve("data/signs.flashcards.ar.generated.json");
const OUTPUT_QUIZ_JSON_PATH = path.resolve("data/signs.quiz.ar.generated.json");
const OUTPUT_REPORT_PATH = path.resolve("data/signs-extraction-report.json");

const PUBLIC_OUTPUT_FLASHCARDS_JSON_PATH = path.resolve("public/data/signs.flashcards.ar.generated.json");
const PUBLIC_OUTPUT_QUIZ_JSON_PATH = path.resolve("public/data/signs.quiz.ar.generated.json");

interface CsvRecord {
  [key: string]: string;
}

interface SignsExtractionReport {
  flashcardsCsvPath: string;
  quizCsvPath: string;
  generatedAt: string;
  flashcardsTotalRows: number;
  flashcardsExtracted: number;
  flashcardsSkipped: number;
  quizTotalRows: number;
  quizExtracted: number;
  quizSkipped: number;
  unresolvedQuizAnswers: number;
  missingImageCount: number;
  imagesSynced: boolean;
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

function normalizeType(value: string): string {
  return value.trim();
}

function formatSourceId(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function buildImagePath(sourceId: number): string {
  return `/assets/sign_images_by_id/${String(sourceId).padStart(3, "0")}.svg`;
}

function localImagePath(sourceId: number, extension: string): string {
  return path.join(SIGNS_IMAGES_SOURCE_PATH, `${String(sourceId).padStart(3, "0")}${extension}`);
}

export function resolveImagePathForSourceId(
  sourceId: number,
  existsAt: (filePath: string) => boolean = existsSync
): string | null {
  for (const extension of SUPPORTED_SIGN_EXTENSIONS) {
    if (existsAt(localImagePath(sourceId, extension))) {
      return `/assets/sign_images_by_id/${String(sourceId).padStart(3, "0")}${extension}`;
    }
  }
  return null;
}

function normalizeCompareText(value: string): string {
  return value
    .replace(/[\s\.,،:؛!?؟"'`]/g, "")
    .replace(/[\u0640]/g, "")
    .toLowerCase()
    .trim();
}

function resolveCorrectOptionIndex(record: CsvRecord, optionsAr: string[]): number {
  const indexRaw = (record["Index of Correct Answer"] ?? "").trim();
  const parsedIndex = Number.parseInt(indexRaw, 10);
  if (!Number.isNaN(parsedIndex) && parsedIndex >= 1 && parsedIndex <= optionsAr.length) {
    return parsedIndex - 1;
  }

  const correctAnswer = (record["Correct Answer"] ?? "").trim();
  if (!correctAnswer) return -1;
  const normalizedAnswer = normalizeCompareText(correctAnswer);
  const matchedIndex = optionsAr.findIndex((option) => normalizeCompareText(option) === normalizedAnswer);
  return matchedIndex;
}

export function buildSignsFlashcardsFromCsv(csvContent: string): {
  flashcardSet: SignFlashcardSet;
  extracted: number;
  skipped: number;
  missingImageCount: number;
} {
  const rows = readCsvRows(csvContent);
  const records = rowsToRecords(rows);

  let skipped = 0;
  let missingImageCount = 0;

  const cards = records
    .map((record, index) => {
      const sourceId = formatSourceId(record["ID"] ?? "");
      const type = normalizeType(record["Type"] ?? "");
      const nameAr = (record["Name in Arabic"] ?? "").trim();

      if (!sourceId || !type || !nameAr) {
        skipped += 1;
        return null;
      }

      const resolvedImagePath = resolveImagePathForSourceId(sourceId);
      if (!resolvedImagePath) {
        missingImageCount += 1;
      }

      return {
        id: `sf-${String(index + 1).padStart(4, "0")}`,
        sourceId,
        type,
        nameAr,
        imagePath: resolvedImagePath ?? buildImagePath(sourceId)
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const flashcardSet: SignFlashcardSet = {
    id: "road-signs-flashcards-ar-v1",
    titleAr: "بطاقات إشارات السير",
    language: "ar",
    direction: "rtl",
    cards,
    importedAt: new Date().toISOString()
  };

  return {
    flashcardSet,
    extracted: cards.length,
    skipped,
    missingImageCount
  };
}

export function buildSignsQuizFromCsv(csvContent: string): {
  quizSet: SignQuizSet;
  extracted: number;
  skipped: number;
  unresolvedAnswers: number;
  missingImageCount: number;
} {
  const rows = readCsvRows(csvContent);
  const records = rowsToRecords(rows);

  let skipped = 0;
  let unresolvedAnswers = 0;
  let missingImageCount = 0;

  const questions = records
    .map((record, index) => {
      const sourceId = formatSourceId(record["ID"] ?? "");
      const type = normalizeType(record["Type"] ?? "");
      const optionsAr = [(record["Option 1"] ?? "").trim(), (record["Option 2"] ?? "").trim(), (record["Option 3"] ?? "").trim()].filter(
        (option) => option.length > 0
      );

      const correctOptionIndex = resolveCorrectOptionIndex(record, optionsAr);
      const correctAnswerAr = (record["Correct Answer"] ?? "").trim();

      if (!sourceId || !type || optionsAr.length < 2 || correctOptionIndex < 0) {
        if (!sourceId || !type || optionsAr.length < 2) {
          skipped += 1;
        } else {
          unresolvedAnswers += 1;
        }
        return null;
      }

      const resolvedImagePath = resolveImagePathForSourceId(sourceId);
      if (!resolvedImagePath) {
        missingImageCount += 1;
      }

      return {
        id: `sq-${String(index + 1).padStart(4, "0")}`,
        sourceId,
        type,
        imagePath: resolvedImagePath ?? buildImagePath(sourceId),
        optionsAr,
        correctOptionIndex,
        correctAnswerAr: correctAnswerAr || optionsAr[correctOptionIndex]
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const quizSet: SignQuizSet = {
    id: "road-signs-quiz-ar-v1",
    titleAr: "اختبار إشارات السير",
    language: "ar",
    direction: "rtl",
    questions,
    importedAt: new Date().toISOString()
  };

  return {
    quizSet,
    extracted: questions.length,
    skipped,
    unresolvedAnswers,
    missingImageCount
  };
}

async function syncImages(): Promise<boolean> {
  if (!existsSync(SIGNS_IMAGES_SOURCE_PATH)) {
    return false;
  }

  await fs.mkdir(path.dirname(SIGNS_IMAGES_PUBLIC_PATH), { recursive: true });
  await fs.cp(SIGNS_IMAGES_SOURCE_PATH, SIGNS_IMAGES_PUBLIC_PATH, { recursive: true });
  return true;
}

async function writeOutputs(
  flashcardSet: SignFlashcardSet,
  quizSet: SignQuizSet,
  report: SignsExtractionReport
): Promise<void> {
  await fs.mkdir(path.dirname(OUTPUT_FLASHCARDS_JSON_PATH), { recursive: true });
  await fs.mkdir(path.dirname(OUTPUT_QUIZ_JSON_PATH), { recursive: true });
  await fs.mkdir(path.dirname(OUTPUT_REPORT_PATH), { recursive: true });
  await fs.mkdir(path.dirname(PUBLIC_OUTPUT_FLASHCARDS_JSON_PATH), { recursive: true });
  await fs.mkdir(path.dirname(PUBLIC_OUTPUT_QUIZ_JSON_PATH), { recursive: true });

  report.imagesSynced = await syncImages();

  const flashcardsJson = JSON.stringify(flashcardSet, null, 2);
  const quizJson = JSON.stringify(quizSet, null, 2);
  await fs.writeFile(OUTPUT_FLASHCARDS_JSON_PATH, flashcardsJson, "utf8");
  await fs.writeFile(OUTPUT_QUIZ_JSON_PATH, quizJson, "utf8");
  await fs.writeFile(PUBLIC_OUTPUT_FLASHCARDS_JSON_PATH, flashcardsJson, "utf8");
  await fs.writeFile(PUBLIC_OUTPUT_QUIZ_JSON_PATH, quizJson, "utf8");
  await fs.writeFile(OUTPUT_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
}

async function main(): Promise<void> {
  const flashcardsCsvPath = process.argv[2] ?? DEFAULT_FLASHCARDS_CSV_PATH;
  const quizCsvPath = process.argv[3] ?? DEFAULT_QUIZ_CSV_PATH;

  if (!existsSync(flashcardsCsvPath)) {
    throw new Error(`Flashcards CSV file not found: ${flashcardsCsvPath}`);
  }
  if (!existsSync(quizCsvPath)) {
    throw new Error(`Quiz CSV file not found: ${quizCsvPath}`);
  }

  const flashcardsCsv = await fs.readFile(flashcardsCsvPath, "utf8");
  const quizCsv = await fs.readFile(quizCsvPath, "utf8");

  const flashcards = buildSignsFlashcardsFromCsv(flashcardsCsv);
  const quiz = buildSignsQuizFromCsv(quizCsv);

  const report: SignsExtractionReport = {
    flashcardsCsvPath,
    quizCsvPath,
    generatedAt: new Date().toISOString(),
    flashcardsTotalRows: rowsToRecords(readCsvRows(flashcardsCsv)).length,
    flashcardsExtracted: flashcards.extracted,
    flashcardsSkipped: flashcards.skipped,
    quizTotalRows: rowsToRecords(readCsvRows(quizCsv)).length,
    quizExtracted: quiz.extracted,
    quizSkipped: quiz.skipped,
    unresolvedQuizAnswers: quiz.unresolvedAnswers,
    missingImageCount: flashcards.missingImageCount + quiz.missingImageCount,
    imagesSynced: false
  };

  await writeOutputs(flashcards.flashcardSet, quiz.quizSet, report);

  // eslint-disable-next-line no-console
  console.log(`Flashcards extracted: ${report.flashcardsExtracted}/${report.flashcardsTotalRows}`);
  // eslint-disable-next-line no-console
  console.log(`Quiz extracted: ${report.quizExtracted}/${report.quizTotalRows}`);
  // eslint-disable-next-line no-console
  console.log(`Unresolved quiz answers: ${report.unresolvedQuizAnswers}`);
  // eslint-disable-next-line no-console
  console.log(`Missing images: ${report.missingImageCount}`);
  // eslint-disable-next-line no-console
  console.log(`Images synced: ${report.imagesSynced ? "yes" : "no"}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
