import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { PDFDocument } from "pdf-lib";
import type { Question, QuestionSet } from "../src/types/qcm";

const execFileAsync = promisify(execFile);
const DEFAULT_PDF_PATH = "/Users/hadikoub/Downloads/exam-questions.pdf";
const OUTPUT_JSON_PATH = path.resolve("data/questions.ar.generated.json");
const OUTPUT_REPORT_PATH = path.resolve("data/extraction-report.json");
const PUBLIC_OUTPUT_JSON_PATH = path.resolve("public/data/questions.ar.generated.json");
const OCR_MIN_TEXT_LENGTH = 120;

interface ParsedBlock {
  sourceNumber: number | null;
  text: string;
}

interface ExtractPageResult {
  pageNumber: number;
  text: string;
  usedOcr: boolean;
}

interface ExtractionReport {
  pdfPath: string;
  generatedAt: string;
  totalPages: number;
  questionsExtracted: number;
  needsReviewCount: number;
  missingAnswerKeyCount: number;
  sparseTextPages: number[];
  ocrUsedPages: number[];
  ocrFailedPages: number[];
}

export function normalizeDigits(value: string): string {
  const arabicIndicDigits = "٠١٢٣٤٥٦٧٨٩";
  const easternArabicDigits = "۰۱۲۳۴۵۶۷۸۹";

  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const indexInArabicIndic = arabicIndicDigits.indexOf(digit);
    if (indexInArabicIndic >= 0) return String(indexInArabicIndic);

    const indexInEastern = easternArabicDigits.indexOf(digit);
    if (indexInEastern >= 0) return String(indexInEastern);

    return digit;
  });
}

export function normalizeWhitespace(value: string): string {
  return normalizeDigits(value)
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeOptionId(raw: string): "A" | "B" | "C" | "D" | null {
  const value = raw.trim().toUpperCase();
  if (value === "A" || value === "أ" || value === "إ" || value === "ا") return "A";
  if (value === "B" || value === "ب") return "B";
  if (value === "C" || value === "ج") return "C";
  if (value === "D" || value === "د") return "D";
  return null;
}

export function parseAnswerKey(text: string): Map<number, "A" | "B" | "C" | "D"> {
  const answerMap = new Map<number, "A" | "B" | "C" | "D">();
  const normalized = normalizeWhitespace(text);

  const sectionStart = normalized.search(/(الإجابات|التصحيح|answer key|answers)/i);
  const scope = sectionStart >= 0 ? normalized.slice(sectionStart) : normalized;

  const regex = /(\d{1,4})\s*[\)\.\-:،]?\s*([A-Dأإابجد])/g;
  for (const match of scope.matchAll(regex)) {
    const number = Number.parseInt(match[1], 10);
    const option = normalizeOptionId(match[2]);
    if (!Number.isNaN(number) && option) {
      answerMap.set(number, option);
    }
  }

  return answerMap;
}

export function splitQuestionBlocks(text: string): ParsedBlock[] {
  const normalized = normalizeWhitespace(text);
  const lines = normalized.split("\n");
  const blocks: ParsedBlock[] = [];
  let current: ParsedBlock | null = null;

  const questionStartPattern = /^\s*(\d{1,4})\s*(?:[\)\.\-:،]|$)\s*(.*)$/;

  for (const line of lines) {
    const matchedStart = line.match(questionStartPattern);
    if (matchedStart) {
      if (current && current.text.trim().length > 0) {
        blocks.push({ ...current, text: current.text.trim() });
      }

      const sourceNumber = Number.parseInt(matchedStart[1], 10);
      current = {
        sourceNumber: Number.isNaN(sourceNumber) ? null : sourceNumber,
        text: matchedStart[2].trim()
      };
      continue;
    }

    if (!current) continue;
    current.text += `\n${line.trim()}`;
  }

  if (current && current.text.trim().length > 0) {
    blocks.push({ ...current, text: current.text.trim() });
  }

  return blocks;
}

function parseChoices(
  blockText: string
): { prompt: string; choices: { id: "A" | "B" | "C" | "D"; textAr: string }[] } {
  const markerPattern = /(?:^|\n)\s*([A-Da-dأإابجد])\s*[\)\.\-:،]\s*/g;
  const markers: { start: number; end: number; id: "A" | "B" | "C" | "D" }[] = [];

  for (const match of blockText.matchAll(markerPattern)) {
    const rawId = match[1];
    const normalized = normalizeOptionId(rawId);
    if (!normalized || typeof match.index !== "number") continue;
    markers.push({
      start: match.index,
      end: match.index + match[0].length,
      id: normalized
    });
  }

  if (markers.length < 2) {
    return {
      prompt: blockText.trim(),
      choices: []
    };
  }

  const prompt = blockText.slice(0, markers[0].start).trim();
  const choices = markers.map((marker, index) => {
    const nextMarker = markers[index + 1];
    const end = nextMarker ? nextMarker.start : blockText.length;
    const textAr = blockText.slice(marker.end, end).trim();
    return {
      id: marker.id,
      textAr
    };
  });

  // Keep first appearance for duplicate markers to avoid corrupting answer map.
  const seen = new Set<string>();
  const uniqueChoices = choices.filter((choice) => {
    if (seen.has(choice.id)) return false;
    seen.add(choice.id);
    return true;
  });

  return {
    prompt,
    choices: uniqueChoices
  };
}

export function parseQuestionBlock(
  block: ParsedBlock,
  pageNumber: number,
  answerMap: Map<number, "A" | "B" | "C" | "D">,
  sequence: number
): Question {
  const parsed = parseChoices(block.text);
  const id = `q-${String(sequence).padStart(4, "0")}`;
  const expectedAnswer = block.sourceNumber ? answerMap.get(block.sourceNumber) ?? null : null;

  let correctChoiceId = expectedAnswer;
  let needsReview = false;

  if (parsed.prompt.length < 6 || parsed.choices.length < 2) {
    needsReview = true;
  }

  if (correctChoiceId && !parsed.choices.some((choice) => choice.id === correctChoiceId)) {
    correctChoiceId = null;
    needsReview = true;
  }

  if (!correctChoiceId) {
    needsReview = true;
  }

  return {
    id,
    promptAr: parsed.prompt,
    choices: parsed.choices,
    correctChoiceId,
    sourcePage: pageNumber,
    sourceNumber: block.sourceNumber,
    needsReview
  };
}

async function isArabicLanguageInstalled(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("tesseract", ["--list-langs"]);
    return /(^|\n)ara(\n|$)/.test(stdout);
  } catch {
    return false;
  }
}

async function extractTextLayerPerPage(pdfPath: string): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = new Uint8Array(await fs.readFile(pdfPath));

  const loadingTask = pdfjs.getDocument({
    data: bytes,
    disableFontFace: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0
  });

  const pdf = await loadingTask.promise;
  const texts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
      .join("\n");
    texts.push(normalizeWhitespace(text));
  }

  return texts;
}

async function runOcrOnPage(
  sourceDoc: PDFDocument,
  pageIndex: number,
  tempDir: string
): Promise<string> {
  const singleDoc = await PDFDocument.create();
  const [copiedPage] = await singleDoc.copyPages(sourceDoc, [pageIndex]);
  singleDoc.addPage(copiedPage);

  const pagePdfPath = path.join(tempDir, `page-${pageIndex + 1}.pdf`);
  const pageImagePath = path.join(tempDir, `page-${pageIndex + 1}.png`);
  await fs.writeFile(pagePdfPath, await singleDoc.save());

  await execFileAsync("sips", ["-s", "format", "png", pagePdfPath, "--out", pageImagePath]);
  const { stdout } = await execFileAsync("tesseract", [pageImagePath, "stdout", "-l", "ara", "--psm", "6"], {
    maxBuffer: 10 * 1024 * 1024
  });

  return normalizeWhitespace(stdout);
}

async function extractPages(pdfPath: string): Promise<{ pages: ExtractPageResult[]; report: ExtractionReport }> {
  const textLayerPages = await extractTextLayerPerPage(pdfPath);
  const sparseTextPages: number[] = [];

  for (let index = 0; index < textLayerPages.length; index += 1) {
    if (textLayerPages[index].replace(/\s+/g, "").length < OCR_MIN_TEXT_LENGTH) {
      sparseTextPages.push(index + 1);
    }
  }

  const canUseArabicOcr = await isArabicLanguageInstalled();
  const pages: ExtractPageResult[] = textLayerPages.map((text, index) => ({
    pageNumber: index + 1,
    text,
    usedOcr: false
  }));

  const ocrUsedPages: number[] = [];
  const ocrFailedPages: number[] = [];

  if (sparseTextPages.length > 0 && canUseArabicOcr) {
    const pdfBytes = await fs.readFile(pdfPath);
    const sourceDoc = await PDFDocument.load(pdfBytes);
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "qcm-ocr-"));

    try {
      for (const pageNumber of sparseTextPages) {
        try {
          const ocrText = await runOcrOnPage(sourceDoc, pageNumber - 1, tempDir);
          if (ocrText.length > 0) {
            pages[pageNumber - 1] = {
              pageNumber,
              text: ocrText,
              usedOcr: true
            };
            ocrUsedPages.push(pageNumber);
          } else {
            ocrFailedPages.push(pageNumber);
          }
        } catch {
          ocrFailedPages.push(pageNumber);
        }
      }
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  }

  return {
    pages,
    report: {
      pdfPath,
      generatedAt: new Date().toISOString(),
      totalPages: textLayerPages.length,
      questionsExtracted: 0,
      needsReviewCount: 0,
      missingAnswerKeyCount: 0,
      sparseTextPages,
      ocrUsedPages,
      ocrFailedPages
    }
  };
}

export async function buildQuestionSet(pdfPath: string): Promise<{ questionSet: QuestionSet; report: ExtractionReport }> {
  if (!existsSync(pdfPath)) {
    throw new Error(`PDF not found: ${pdfPath}`);
  }

  const { pages, report } = await extractPages(pdfPath);
  const fullText = pages.map((item) => item.text).join("\n\n");
  const answerMap = parseAnswerKey(fullText);

  const questions: Question[] = [];
  let sequence = 1;

  for (const page of pages) {
    const blocks = splitQuestionBlocks(page.text);
    for (const block of blocks) {
      questions.push(parseQuestionBlock(block, page.pageNumber, answerMap, sequence));
      sequence += 1;
    }
  }

  const questionSet: QuestionSet = {
    id: "exam-questions-ar-v1",
    titleAr: "أسئلة امتحان السياقة",
    language: "ar",
    direction: "rtl",
    questions,
    importedAt: new Date().toISOString()
  };

  report.questionsExtracted = questions.length;
  report.needsReviewCount = questions.filter((question) => question.needsReview).length;
  report.missingAnswerKeyCount = questions.filter((question) => !question.correctChoiceId).length;

  return { questionSet, report };
}

async function writeOutputs(questionSet: QuestionSet, report: ExtractionReport): Promise<void> {
  await fs.mkdir(path.dirname(OUTPUT_JSON_PATH), { recursive: true });
  await fs.mkdir(path.dirname(OUTPUT_REPORT_PATH), { recursive: true });
  await fs.mkdir(path.dirname(PUBLIC_OUTPUT_JSON_PATH), { recursive: true });

  const outputJson = JSON.stringify(questionSet, null, 2);
  await fs.writeFile(OUTPUT_JSON_PATH, outputJson, "utf8");
  await fs.writeFile(PUBLIC_OUTPUT_JSON_PATH, outputJson, "utf8");
  await fs.writeFile(OUTPUT_REPORT_PATH, JSON.stringify(report, null, 2), "utf8");
}

async function main(): Promise<void> {
  const pdfPath = process.argv[2] ?? DEFAULT_PDF_PATH;
  const { questionSet, report } = await buildQuestionSet(pdfPath);
  await writeOutputs(questionSet, report);

  // eslint-disable-next-line no-console
  console.log(`Generated ${questionSet.questions.length} questions`);
  // eslint-disable-next-line no-console
  console.log(`Needs review: ${report.needsReviewCount}`);
  // eslint-disable-next-line no-console
  console.log(`Output: ${OUTPUT_JSON_PATH}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
